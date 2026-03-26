require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const paypal = require('@paypal/checkout-server-sdk');

const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

function paypalClient() {
  let environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_SECRET
  );
  return new paypal.core.PayPalHttpClient(environment);
}

const adminAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Failed to authenticate' });
    req.admin = decoded;
    next();
  });
};


app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = new User({ name, email });
    const saved = await user.save();
    console.log(`[User] New signup: ${email}`);
    res.status(201).json(saved);
  } catch (err) {
    console.error(`[User] Signup failed for ${req.body.email}:`, err.message);
    res.status(400).json({ error: 'Could not create account' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price } = req.body;
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;
      console.log(`[Studio] Received image: ${req.file.originalname} (${req.file.size} bytes)`);
    }

    if (!imageUrl) {
      console.warn('[Studio] Upload aborted: No image or URL provided');
      return res.status(400).json({ error: 'Product image is required.' });
    }

    const product = new Product({ name, description, price, imageUrl });
    const saved = await product.save();
    console.log(`[Studio] Product added successfully: ${name}`);
    res.status(201).json(saved);
  } catch (err) {
    console.error('[Studio] Critical Upload Error:', err.message);
    res.status(400).json({ error: 'Database rejected product', details: err.message });
  }
});

app.put('/api/products/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      updateData.imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    }
    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, amount } = req.body;
    const order = new Order({ userId, items, amount });
    const saved = await order.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().populate('userId items.productId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).populate('items.productId').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

app.post('/api/pay/create-order', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    console.log('Using Base URL for PayPal:', baseUrl);

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
      console.error('CRITICAL: PayPal credentials missing in environment variables!');
      return res.status(500).json({ error: 'PayPal is currently not configured on the server.' });
    }

    const { items, userId } = req.body;
    let total = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      total += product.price * item.quantity;
      orderItems.push({ productId: product._id, quantity: item.quantity });
    }

    const order = new Order({
      userId: userId || process.env.DUMMY_USER_ID,
      items: orderItems,
      amount: total,
      status: 'Pending'
    });
    await order.save();

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order._id.toString(),
        amount: {
          currency_code: 'USD',
          value: total.toFixed(2)
        }
      }],
      application_context: {
        return_url: `${baseUrl}/api/pay/capture-order?orderId=${order._id}`,
        cancel_url: `${baseUrl}/index.html?status=failed`,
        brand_name: 'MOON SENCE',
        user_action: 'PAY_NOW'
      }
    });

    const ppResponse = await paypalClient().execute(request);
    console.log('PayPal Order Created:', ppResponse.result.id);

    order.paypalTransactionId = ppResponse.result.id;
    await order.save();

    const approvalLink = ppResponse.result.links.find(link => link.rel === 'approve');
    res.json({ approvalUrl: approvalLink.href });

  } catch (err) {
    // Detailed capture for PayPal debugging
    console.error('PayPal Order Flow Interrupted:', err.message);
    res.status(500).json({ 
      error: 'Checkout is temporarily unavailable', 
      details: process.env.NODE_ENV === 'development' ? err.message : 'Please contact support.'
    });
  }
});

app.get('/api/pay/capture-order', async (req, res) => {
  try {
    const { token, orderId } = req.query;
    console.log(`Capturing Order: ${orderId}, Token: ${token}`);

    if (!orderId) {
      console.error('Missing orderId in capture-order!');
      return res.redirect('/index.html?status=error&message=missing_order_id');
    }

    let request = new paypal.orders.OrdersCaptureRequest(token);
    request.requestBody({});
    const ppResponse = await paypalClient().execute(request);
    console.log('PayPal Capture Status:', ppResponse.result.status);

    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order ${orderId} not found in database during capture!`);
      return res.redirect('/index.html?status=error&message=order_not_found');
    }

    if (ppResponse.result.status === 'COMPLETED') {
      order.status = 'Completed';
      order.paypalTransactionId = ppResponse.result.id;
      await order.save();
      console.log(`Order ${orderId} successfully completed.`);
      return res.redirect('/orders.html?status=success');
    }

    console.warn(`Order ${orderId} capture status was: ${ppResponse.result.status}`);
    order.status = 'Failed';
    await order.save();
    res.redirect('/index.html?status=failed');
  } catch (err) {
    console.error('PayPal Capture Error:', err);
    const { orderId } = req.query;
    if (orderId) await Order.findByIdAndUpdate(orderId, { status: 'Failed' });
    res.redirect('/index.html?status=failed');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;

import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  collection, doc, setDoc, getDocs, deleteDoc, onSnapshot
} from 'firebase/firestore';

const PRODUCTS = [
  { id:1, name:'Tamatar', hindi:'टमाटर', price:40, stock:100, category:'Sabzi', image:'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?q=80&w=600&auto=format&fit=crop' },
  { id:2, name:'Aloo', hindi:'आलू', price:30, stock:150, category:'Sabzi', image:'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=600&auto=format&fit=crop' },
  { id:3, name:'Pyaz', hindi:'प्याज़', price:35, stock:120, category:'Sabzi', image:'https://images.unsplash.com/photo-1508747703725-719777637510?q=80&w=600&auto=format&fit=crop' },
  { id:4, name:'Adrak', hindi:'अदरक', price:90, stock:80, category:'Masala', image:'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=600&auto=format&fit=crop' },
  { id:5, name:'Bhindi', hindi:'भिंडी', price:60, stock:95, category:'Sabzi', image:'https://images.unsplash.com/photo-1603048719539-9ecb4b2d8f5d?q=80&w=600&auto=format&fit=crop' },
  { id:6, name:'Shimla Mirch', hindi:'शिमला मिर्च', price:80, stock:75, category:'Sabzi', image:'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=600&auto=format&fit=crop' },
  { id:7, name:'Seb', hindi:'सेब', price:120, stock:140, category:'Phal', image:'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=600&auto=format&fit=crop' },
  { id:8, name:'Aam', hindi:'आम', price:150, stock:110, category:'Phal', image:'https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=600&auto=format&fit=crop' },
  { id:9, name:'Baingan', hindi:'बैंगन', price:50, stock:100, category:'Sabzi', image:'https://images.unsplash.com/photo-1603048719693-bb4f0d0cb8c4?q=80&w=600&auto=format&fit=crop' },
  { id:10, name:'Ghiya', hindi:'घिया', price:45, stock:85, category:'Sabzi', image:'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?q=80&w=600&auto=format&fit=crop' },
  { id:11, name:'Kheera', hindi:'खीरा', price:40, stock:130, category:'Sabzi', image:'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?q=80&w=600&auto=format&fit=crop' },
];

const WHATSAPP_NUMBER = '917018970235';
const ADMIN_PASSWORD = 'bhooshan';
const CATEGORIES = ['All', 'Sabzi', 'Phal', 'Masala'];

export default function App() {
  const [page, setPage] = useState('shop');
  const [filter, setFilter] = useState('All');

  // ── Firebase: Products realtime sync ──────────────────────────
  const [fbLoading, setFbLoading] = useState(true);
  const [fbError,   setFbError]   = useState(false);

  // Undo/Redo history (sirf local session ke liye)
  const [hist, setHist] = useState([PRODUCTS]);
  const [hi,   setHi]   = useState(0);
  const products = hist[hi];

  // App start hone par Firebase se products load karo (realtime)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (snap.empty) {
          // Pehli baar: default products Firebase mein save karo
          PRODUCTS.forEach(p =>
            setDoc(doc(db, 'products', String(p.id)), p)
          );
          setHist([PRODUCTS]);
        } else {
          const fetched = snap.docs
            .map(d => d.data())
            .sort((a, b) => (a.id > b.id ? 1 : -1));
          setHist([fetched]);
          setHi(0);
        }
        setFbLoading(false);
      },
      () => { setFbError(true); setFbLoading(false); }
    );
    return () => unsub();
  }, []);

  // Firebase mein save karo jab bhi pushP call ho
  const saveToFirebase = async (newProducts) => {
    try {
      // Delete jo products hata diye
      const snap = await getDocs(collection(db, 'products'));
      const existingIds = snap.docs.map(d => d.id);
      const newIds = newProducts.map(p => String(p.id));
      for (const eid of existingIds) {
        if (!newIds.includes(eid))
          await deleteDoc(doc(db, 'products', eid));
      }
      // Add/update sab products
      for (const p of newProducts) {
        await setDoc(doc(db, 'products', String(p.id)), p);
      }
    } catch (e) { console.error('Firebase save error:', e); }
  };

  const pushP = (np) => {
    const nh = hist.slice(0, hi + 1).concat([np]);
    setHist(nh);
    setHi(nh.length - 1);
    saveToFirebase(np);
  };
  const undo = () => {
    if (hi > 0) { setHi(hi - 1); saveToFirebase(hist[hi - 1]); }
  };
  const redo = () => {
    if (hi < hist.length - 1) { setHi(hi + 1); saveToFirebase(hist[hi + 1]); }
  };

  // Cart
  const [cart, setCart] = useState([]);
  const addToCart = (p) => setCart(prev => {
    const ex = prev.find(i => i.id === p.id);
    if (ex) return prev.map(i => i.id === p.id ? {...i, qty: i.qty+1} : i);
    return [...prev, {...p, qty: 1}];
  });
  const changeQty = (id, d) => setCart(prev => prev.map(i => i.id===id ? {...i, qty: i.qty+d} : i).filter(i => i.qty > 0));
  const removeCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const cartQty = cart.reduce((a,i) => a+i.qty, 0);
  const cartTotal = cart.reduce((a,i) => a+i.price*i.qty, 0);

  // Order
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [pay, setPay] = useState('Cash on Delivery');
  const [orders, setOrders] = useState([]);

  const placeOrder = () => {
    if (!cart.length || !name || !phone) { alert('Naam, phone aur cart zaroori hai!'); return; }
    const oid = Math.floor(Math.random() * 100000);
    let msg = `🛒 NEW ORDER%0A%0A🆔 Order: ${oid}%0A👤 ${name}%0A📞 ${phone}%0A📍 ${addr}%0A💳 ${pay}%0A%0A📦 Items:%0A`;
    cart.forEach(i => { msg += `• ${i.name} × ${i.qty}kg = ₹${i.price*i.qty}%0A`; });
    msg += `%0A💰 Total: ₹${cartTotal}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    setOrders(prev => [...prev, { id:oid, name, phone, addr, pay, items:[...cart], total:cartTotal, status:'Pending', time:new Date().toLocaleTimeString('hi-IN') }]);
    setCart([]); setName(''); setPhone(''); setAddr('');
  };

  // Admin
  const [pass, setPass] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newP, setNewP] = useState({ name:'', price:'', stock:'', image:'' });

  const addProduct = () => {
    if (!newP.name || !newP.price) return;
    pushP([...products, { id:Date.now(), ...newP, price:+newP.price, stock:+newP.stock, category:'Sabzi', hindi:'' }]);
    setNewP({ name:'', price:'', stock:'', image:'' });
  };

  const visibleProducts = filter === 'All' ? products : products.filter(p => p.category === filter);

  return (
    <div className="app">

      {/* FIREBASE LOADING */}
      {fbLoading && (
        <div className="fb-loading">
          <div className="fb-spinner"></div>
          <p>Products load ho rahe hain...</p>
        </div>
      )}
      {fbError && (
        <div className="fb-error">
          ⚠️ Firebase connect nahi hua. Internet check karo ya Firestore rules open karo.
        </div>
      )}

      {!fbLoading && <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => setPage('shop')}>
          🌿 Fresh<span>Farm</span>
        </div>
        <div className="nav-links">
          {['shop','cart','orders','admin'].map(v => (
            <button key={v} className={`nav-link${page===v?' active':''}`} onClick={() => setPage(v)}>
              {v === 'cart' ? `🛒 Cart (${cartQty})` : v === 'shop' ? '🏪 Shop' : v === 'orders' ? '📦 Orders' : '⚙️ Admin'}
            </button>
          ))}
        </div>
      </nav>

      {/* SHOP PAGE */}
      {page === 'shop' && (
        <>
          <section className="hero">
            <div className="hero-overlay" />
            <div className="hero-content">
              <div className="hero-tag">100% Organic &amp; Fresh</div>
              <h1 className="hero-title">Ghar Baitha Order Karo,<br /><em>Taaza Sabzi</em> Pao</h1>
              <p className="hero-sub">Roz subah khet se kati hui taaza sabziyan aapke darwaze tak</p>
              <div className="hero-btns">
                <button className="btn-gold" onClick={() => { const el = document.getElementById('products'); el && el.scrollIntoView({behavior:'smooth'}); }}>Abhi Kharidein</button>
                <button className="btn-outline" onClick={() => setPage('cart')}>Cart Dekho ({cartQty})</button>
              </div>
            </div>
          </section>

          <div className="stats-bar">
            {[['500+','Khush Customers'],['11+','Taaza Products'],['Roz','Home Delivery'],['100%','Organic']].map(([n,l]) => (
              <div className="stat-item" key={l}>
                <div className="stat-num">{n}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>

          <section className="products-section" id="products">
            <div className="section-header">
              <div>
                <h2 className="section-title">Aaj Ki <span>Taaza Sabziyan</span></h2>
                <p className="section-sub">Subah kati hui, seedhi aapke ghar</p>
              </div>
              <div className="cat-filters">
                {CATEGORIES.map(c => (
                  <button key={c} className={`cat-btn${filter===c?' active':''}`} onClick={() => setFilter(c)}>{c}</button>
                ))}
              </div>
            </div>

            <div className="products-grid">
              {visibleProducts.map(p => {
                const ci = cart.find(c => c.id === p.id);
                return (
                  <div key={p.id} className="product-card">
                    <div className="product-img-wrap">
                      <img src={p.image} alt={p.name} className="product-img" />
                      <span className="product-badge">{p.category}</span>
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className="product-hindi">{p.hindi}</div>
                      <div className="product-price-row">
                        <span className="product-price">₹{p.price}</span>
                        <span className="product-unit">/kg</span>
                      </div>
                      <div className="product-stock">📦 {p.stock}kg available</div>
                      {ci && (
                        <div className="qty-row">
                          <button className="qty-btn minus" onClick={() => changeQty(p.id, -1)}>−</button>
                          <span className="qty-num">{ci.qty} kg</span>
                          <button className="qty-btn plus" onClick={() => changeQty(p.id, 1)}>+</button>
                        </div>
                      )}
                      <button className={`add-btn${ci ? ' added' : ''}`} onClick={() => addToCart(p)}>
                        {ci ? '+ Aur Daalo' : '🛒 Cart Mein Daalo'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="payment-strip">
            <h2>💳 Online Payment Supported</h2>
            <p>UPI &nbsp;•&nbsp; Paytm &nbsp;•&nbsp; PhonePe &nbsp;•&nbsp; Google Pay &nbsp;•&nbsp; Debit/Credit Card</p>
          </section>
        </>
      )}

      {/* CART PAGE */}
      {page === 'cart' && (
        <div className="page-wrap">
          <div className="page-header">
            <div>
              <h2 className="page-title">Mera <span>Cart</span></h2>
              <p className="page-sub">{cartQty} item{cartQty !== 1 ? 's' : ''} selected</p>
            </div>
            {cart.length > 0 && (
              <button className="btn-red" onClick={() => setCart([])}>Cart Khaali Karo</button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <h3>Cart Abhi Khaali Hai</h3>
              <p>Kuch taaza sabziyan daalo!</p>
              <button className="btn-gold" onClick={() => setPage('shop')}>Shop Par Jao</button>
            </div>
          ) : (
            <>
              <div className="cart-list">
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image} alt={item.name} className="cart-thumb" />
                    <div className="cart-info">
                      <div className="cart-name">{item.name}</div>
                      <div className="cart-unit-price">₹{item.price}/kg</div>
                      <div className="cart-qty-row">
                        <button className="cq-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                        <span className="cq-num">{item.qty} kg</span>
                        <button className="cq-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                    <div className="cart-right">
                      <div className="cart-subtotal">₹{item.price * item.qty}</div>
                      <button className="cart-remove" onClick={() => removeCart(item.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-total-bar">
                <span>Kul Rakam</span>
                <span className="cart-total-amount">₹{cartTotal}</span>
              </div>

              <div className="order-form">
                <h3 className="form-title">Delivery Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Aapka Naam *</label>
                    <input placeholder="Jaise: Ramesh Kumar" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input placeholder="+91 XXXXX XXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea placeholder="Ghar ka pura pata likhein..." value={addr} onChange={e => setAddr(e.target.value)} rows={3} />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={pay} onChange={e => setPay(e.target.value)}>
                    <option>Cash on Delivery</option>
                    <option>UPI</option>
                    <option>PhonePe</option>
                    <option>Google Pay</option>
                    <option>Paytm</option>
                  </select>
                </div>
                <button className="whatsapp-btn" onClick={placeOrder}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp Par Order Karo — ₹{cartTotal}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ORDERS PAGE */}
      {page === 'orders' && (
        <div className="page-wrap">
          <div className="page-header">
            <div>
              <h2 className="page-title">Mere <span>Orders</span></h2>
              <p className="page-sub">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Koi Order Nahi Hai</h3>
              <p>Pehla order dene ke liye shop par jao!</p>
              <button className="btn-gold" onClick={() => setPage('shop')}>Shop Karo</button>
            </div>
          ) : (
            <div className="orders-list">
              {[...orders].reverse().map(o => (
                <div key={o.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-id">Order #{o.id}</div>
                      <div className="order-meta">👤 {o.name} &nbsp;•&nbsp; 📞 {o.phone} &nbsp;•&nbsp; 💳 {o.pay}</div>
                    </div>
                    <span className="order-badge">{o.status}</span>
                  </div>
                  <div className="order-items">
                    {o.items.map((it, i) => (
                      <span key={i} className="order-item-tag">{it.name} × {it.qty}kg</span>
                    ))}
                  </div>
                  <div className="order-total">₹{o.total}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADMIN PAGE */}
      {page === 'admin' && (
        <div className="admin-page">
          <div className="admin-wrap">
            <div className="admin-page-header">
              <h2>Admin Dashboard</h2>
              <p>FreshFarm Store Management</p>
            </div>

            {!isAdmin ? (
              <div className="admin-login-card">
                <div className="lock-icon">🔐</div>
                <h3>Secure Login</h3>
                <p>Password daalo admin panel kholne ke liye</p>
                <input
                  type="password"
                  className="admin-input"
                  placeholder="Password..."
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (pass === ADMIN_PASSWORD ? setIsAdmin(true) : alert('Galat password!'))}
                />
                <button className="btn-gold full-width" onClick={() => pass === ADMIN_PASSWORD ? setIsAdmin(true) : alert('Galat password!')}>
                  Login Karo
                </button>
              </div>
            ) : (
              <div className="admin-panel">
                <div className="admin-topbar">
                  <h3>👨‍💼 Welcome, Admin</h3>
                  <div className="admin-actions">
                    <button className="undo-btn" disabled={hi === 0} onClick={undo}>↩ Undo</button>
                    <button className="redo-btn" disabled={hi === hist.length-1} onClick={redo}>Redo ↪</button>
                    <button className="reset-btn" onClick={async () => {
                      if (window.confirm('Sab products default par reset ho jayenge. Pakka?')) {
                        await saveToFirebase(PRODUCTS);
                        setHist([PRODUCTS]);
                        setHi(0);
                      }
                    }}>🔄 Reset</button>
                    <button className="logout-btn" onClick={() => { setIsAdmin(false); setPass(''); }}>Logout</button>
                  </div>
                </div>
                <div className="hist-info">
                  🔥 Firebase se connected — har device par same data &nbsp;|&nbsp; Undo {hi > 0 ? '✅' : '❌'} &nbsp;|&nbsp; Redo {hi < hist.length-1 ? '✅' : '❌'}
                </div>

                <div className="add-product-form">
                  <h4>➕ Naya Product Add Karo</h4>
                  <div className="add-form-grid">
                    <input className="admin-input" placeholder="Product naam" value={newP.name} onChange={e => setNewP({...newP, name:e.target.value})} />
                    <input className="admin-input" type="number" placeholder="Price ₹" value={newP.price} onChange={e => setNewP({...newP, price:e.target.value})} />
                    <input className="admin-input" type="number" placeholder="Stock (kg)" value={newP.stock} onChange={e => setNewP({...newP, stock:e.target.value})} />
                    <input className="admin-input" placeholder="Image URL" value={newP.image} onChange={e => setNewP({...newP, image:e.target.value})} />
                  </div>
                  <button className="btn-gold" onClick={addProduct}>Add Product</button>
                </div>

                <div className="admin-products-list">
                  <div className="list-label">{products.length} Products</div>
                  {products.map(p => (
                    <div key={p.id} className="admin-product-row">
                      {p.image && <img src={p.image} alt={p.name} className="admin-prod-img" />}
                      <div className="admin-prod-info">
                        <div className="admin-prod-name">{p.name} {p.hindi && <small>{p.hindi}</small>}</div>
                        <div className="admin-prod-meta">₹{p.price}/kg &nbsp;•&nbsp; Stock: {p.stock}kg</div>
                      </div>
                      <div className="admin-prod-actions">
                        <input
                          type="number"
                          className="price-input"
                          placeholder="Naya price"
                          onBlur={e => { if (e.target.value) pushP(products.map(i => i.id===p.id ? {...i, price:+e.target.value} : i)); e.target.value = ''; }}
                        />
                        <button className="delete-btn" onClick={() => pushP(products.filter(i => i.id !== p.id))}>🗑 Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">🌿 FreshFarm Store</div>
        <div className="footer-links">
          {['shop','cart','orders'].map(v => (
            <button key={v} className="footer-link" onClick={() => setPage(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="footer-copy">© 2026 FreshFarm Store — Taaza Sabziyan, Ghar Tak</div>
      </footer>
      </>}
    </div>
  );
}

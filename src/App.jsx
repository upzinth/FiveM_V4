import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  ShoppingCart,
  Package,
  LayoutDashboard,
  LogOut,
  CreditCard,
  Settings,
  History,
  ShieldCheck,
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Award,
  Database
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';

// --- CONFIGURATION & FIREBASE SETUP ---
// NOTE: These variables should be provided by your environment or a bridge
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'fivem-manager-v1';

// --- TRANSLATIONS ---
const i18n = {
  th: {
    dashboard: "แดชบอร์ด",
    shop: "ร้านค้าไอเทม",
    inventory: "คลังสมบัติ",
    history: "ประวัติการซื้อ",
    admin: "ผู้ดูแลระบบ",
    balance: "ยอดคงเหลือ",
    topUp: "เติมเงิน",
    buy: "ซื้อตอนนี้",
    profile: "โปรไฟล์ผู้เล่น",
    rank: "ยศ",
    online: "ออนไลน์",
    offline: "ออฟไลน์",
    serverStatus: "สถานะเซิร์ฟเวอร์",
    players: "ผู้เล่น",
    search: "ค้นหา...",
    category: "หมวดหมู่",
    all: "ทั้งหมด",
    cars: "รถยนต์",
    weapons: "อาวุธ",
    items: "ไอเทมทั่วไป",
    transactionSuccess: "การซื้อสำเร็จ!",
    insufficientFunds: "เงินไม่พอ!",
    confirmBuy: "คุณต้องการซื้อไอเทมนี้ใช่หรือไม่?",
    cancel: "ยกเลิก",
    confirm: "ยืนยัน",
    welcome: "ยินดีต้อนรับกลับ",
    logout: "ออกจากระบบ"
  },
  en: {
    dashboard: "Dashboard",
    shop: "Item Shop",
    inventory: "Inventory",
    history: "Transaction History",
    admin: "Admin Panel",
    balance: "Balance",
    topUp: "Top Up",
    buy: "Buy Now",
    profile: "Player Profile",
    rank: "Rank",
    online: "Online",
    offline: "Offline",
    serverStatus: "Server Status",
    players: "Players",
    search: "Search...",
    category: "Category",
    all: "All",
    cars: "Vehicles",
    weapons: "Weapons",
    items: "General Items",
    transactionSuccess: "Purchase Successful!",
    insufficientFunds: "Insufficient Funds!",
    confirmBuy: "Are you sure you want to buy this item?",
    cancel: "Cancel",
    confirm: "Confirm",
    welcome: "Welcome back",
    logout: "Log Out"
  }
};

// --- MOCK DATA ---
const MOCK_SHOP_ITEMS = [
  { id: 'v_1', name: 'Zentorno Custom', price: 5000, category: 'cars', img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&q=80&w=400', desc: 'Fastest car in the city.' },
  { id: 'w_1', name: 'Special Carbine', price: 2500, category: 'weapons', img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&q=80&w=400', desc: 'High accuracy and rate of fire.' },
  { id: 'i_1', name: 'Medkit x10', price: 500, category: 'items', img: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=400', desc: 'Essential for survival.' },
  { id: 'v_2', name: 'Ducati Panigale', price: 3500, category: 'cars', img: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=400', desc: 'Agile and stylish.' },
];

const App = () => {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('th');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [playerData, setPlayerData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const t = i18n[lang];

  // --- INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    // Sync Player Profile
    const playerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
    const unsubProfile = onSnapshot(playerRef, (docSnap) => {
      if (docSnap.exists()) {
        setPlayerData(docSnap.data());
      } else {
        // Init default profile
        const defaultData = {
          name: "FiveM Player #" + user.uid.slice(0, 4),
          balance: 10000,
          rank: 'Citizen',
          playtime: 120,
          steamId: 'steam:1100001234567',
          lastSeen: new Date().toISOString()
        };
        setDoc(playerRef, defaultData);
        setPlayerData(defaultData);
      }
      setLoading(false);
    }, (err) => {
      console.error("Profile sync error:", err);
      setLoading(false);
    });

    // Sync Transactions
    const transRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const unsubTrans = onSnapshot(transRef, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(list.sort((a, b) => b.timestamp - a.timestamp));
    });

    // Sync Inventory
    const invRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');
    const unsubInv = onSnapshot(invRef, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(list);
    });

    return () => {
      unsubProfile();
      unsubTrans();
      unsubInv();
    };
  }, [user]);

  // --- ACTIONS ---
  const handlePurchase = async (item) => {
    if (playerData.balance < item.price) {
      setModal({ type: 'error', message: t.insufficientFunds });
      return;
    }

    try {
      const newBalance = playerData.balance - item.price;

      // Update Balance
      const playerRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await updateDoc(playerRef, { balance: newBalance });

      // Log Transaction
      const transRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
      await addDoc(transRef, {
        itemName: item.name,
        price: item.price,
        type: 'purchase',
        timestamp: Date.now()
      });

      // Add to Inventory
      const invRef = collection(db, 'artifacts', appId, 'users', user.uid, 'inventory');
      await addDoc(invRef, {
        itemId: item.id,
        name: item.name,
        category: item.category,
        acquiredAt: Date.now()
      });

      setModal({ type: 'success', message: t.transactionSuccess });
    } catch (err) {
      console.error("Purchase failed", err);
    }
  };

  const filteredItems = useMemo(() => {
    return MOCK_SHOP_ITEMS.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filter === 'all' || item.category === filter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, filter]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
              5M
            </div>
            <h1 className="text-xl font-bold tracking-tight">NIGHT<span className="text-indigo-500">CFX</span></h1>
          </div>

          <nav className="space-y-1">
            <NavItem
              icon={<LayoutDashboard size={20} />}
              label={t.dashboard}
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <NavItem
              icon={<ShoppingCart size={20} />}
              label={t.shop}
              active={activeTab === 'shop'}
              onClick={() => setActiveTab('shop')}
            />
            <NavItem
              icon={<Package size={20} />}
              label={t.inventory}
              active={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
            />
            <NavItem
              icon={<History size={20} />}
              label={t.history}
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />
            <NavItem
              icon={<ShieldCheck size={20} />}
              label={t.admin}
              active={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
            />
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">{t.serverStatus}</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {t.online}
              </span>
            </div>
            <div className="text-lg font-semibold">124 / 200 {t.players}</div>
          </div>

          <button
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="w-full flex items-center gap-2 p-2 px-3 text-sm hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
          >
            <Globe size={16} />
            {lang === 'th' ? 'English Language' : 'สลับเป็นภาษาไทย'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold">5M</div>
            <h2 className="font-semibold text-lg">{t[activeTab]}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400">
              <CreditCard size={16} />
              <span className="font-bold">{playerData?.balance?.toLocaleString() || 0}</span>
              <span className="text-xs uppercase opacity-70">Points</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{playerData?.name || 'Loading...'}</p>
                <p className="text-xs text-slate-400">{playerData?.rank || '...'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-indigo-500/50 overflow-hidden flex items-center justify-center">
                <User className="text-slate-300" size={24} />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <DashboardView t={t} playerData={playerData} inventory={inventory} transactions={transactions} />}
          {activeTab === 'shop' && (
            <ShopView
              t={t}
              items={filteredItems}
              onBuy={handlePurchase}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filter={filter}
              setFilter={setFilter}
            />
          )}
          {activeTab === 'inventory' && <InventoryView t={t} inventory={inventory} />}
          {activeTab === 'history' && <HistoryView t={t} transactions={transactions} />}
          {activeTab === 'admin' && <AdminView t={t} />}
        </div>
      </main>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              {modal.type === 'success' ? (
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{modal.type === 'success' ? 'Success' : 'Attention'}</h3>
              <p className="text-slate-400 mb-6">{modal.message}</p>
              <button
                onClick={() => setModal(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors font-semibold"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
        ? 'bg-indigo-600/10 text-indigo-400 border-r-4 border-indigo-600'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const DashboardView = ({ t, playerData, inventory, transactions }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{t.welcome}, {playerData?.name} 👋</h1>
        <p className="text-slate-400 mt-1">นี่คือภาพรวมของสถานะตัวละครและกิจกรรมล่าสุดของคุณ</p>
      </div>
      <button className="hidden sm:block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all">
        {t.topUp}
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label={t.balance} value={playerData?.balance?.toLocaleString() || 0} icon={<CreditCard className="text-indigo-400" />} />
      <StatCard label={t.rank} value={playerData?.rank || '...'} icon={<Award className="text-amber-400" />} />
      <StatCard label={t.inventory} value={inventory.length} icon={<Package className="text-blue-400" />} />
      <StatCard label="Playtime" value={`${playerData?.playtime || 0}h`} icon={<History className="text-emerald-400" />} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-500" />
          Recent Activity
        </h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {transactions.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <p className="font-medium">{tx.itemName}</p>
                      <p className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-bold">-{tx.price}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">No recent transactions.</div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Server Stats</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Players</span>
            <span className="font-mono text-indigo-400 font-bold">4,129</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Discord Members</span>
            <span className="font-mono text-indigo-400 font-bold">12,450</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-[62%]"></div>
          </div>
          <p className="text-xs text-slate-500">The server is currently at high load. Expected peak time in 2 hours.</p>
        </div>
      </div>
    </div>
  </div>
);

const ShopView = ({ t, items, onBuy, searchQuery, setSearchQuery, filter, setFilter }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder={t.search}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
        {['all', 'cars', 'weapons', 'items'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            {t[cat]}
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {items.map(item => (
        <div key={item.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all hover:-translate-y-1 shadow-xl">
          <div className="h-48 relative overflow-hidden">
            <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-xs font-bold uppercase text-indigo-400 border border-indigo-500/30">
              {item.category}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <h4 className="text-lg font-bold">{item.name}</h4>
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-2xl font-bold text-indigo-400">{item.price.toLocaleString()}</span>
                <span className="text-xs ml-1 text-slate-500 uppercase">Points</span>
              </div>
              <button
                onClick={() => onBuy(item)}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 group/btn"
              >
                {t.buy}
                <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InventoryView = ({ t, inventory }) => (
  <div className="animate-in fade-in duration-500">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {inventory.length > 0 ? inventory.map(item => (
        <div key={item.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            {item.category === 'cars' ? <LayoutDashboard size={24} /> : <Package size={24} />}
          </div>
          <div>
            <h4 className="font-bold">{item.name}</h4>
            <p className="text-xs text-slate-500">Acquired: {new Date(item.acquiredAt).toLocaleDateString()}</p>
          </div>
        </div>
      )) : (
        <div className="col-span-full py-20 text-center">
          <Package size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-400">Inventory Empty</h3>
          <p className="text-slate-500">Items purchased from the shop will appear here.</p>
        </div>
      )}
    </div>
  </div>
);

const HistoryView = ({ t, transactions }) => (
  <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden animate-in fade-in duration-500">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase">
          <th className="px-6 py-4 font-semibold">Reference</th>
          <th className="px-6 py-4 font-semibold">Item</th>
          <th className="px-6 py-4 font-semibold">Date</th>
          <th className="px-6 py-4 font-semibold text-right">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {transactions.map(tx => (
          <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
            <td className="px-6 py-4 font-mono text-xs text-slate-500 uppercase">{tx.id.slice(0, 8)}</td>
            <td className="px-6 py-4 font-medium">{tx.itemName}</td>
            <td className="px-6 py-4 text-sm text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
            <td className="px-6 py-4 text-right font-bold text-indigo-400">-{tx.price.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AdminView = ({ t }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Database size={24} className="text-indigo-500" />
        <h3 className="text-2xl font-bold">System Maintenance</h3>
      </div>
      <p className="text-slate-400">Manage global item lists, update prices, and monitor server resource health directly from this panel.</p>

      <div className="space-y-3">
        <AdminAction label="Update Shop Stock" desc="Refill or change item availability" />
        <AdminAction label="Mass Announcement" desc="Send global notification to online players" />
        <AdminAction label="Backup Database" desc="Perform immediate snapshot of user data" />
      </div>
    </div>

    <div className="bg-indigo-600 rounded-2xl p-8 flex flex-col justify-between text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
      <div className="relative z-10">
        <h3 className="text-2xl font-bold mb-4">Staff Support</h3>
        <p className="opacity-90 leading-relaxed">
          Need assistance with server integration? Check the documentation or contact our lead developer via Discord.
        </p>
      </div>
      <button className="relative z-10 mt-8 w-fit px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-slate-100 transition-colors">
        View Integration Guide
      </button>
      <div className="absolute -bottom-8 -right-8 opacity-10">
        <Settings size={200} />
      </div>
    </div>
  </div>
);

const AdminAction = ({ label, desc }) => (
  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group">
    <div>
      <p className="font-bold group-hover:text-indigo-400 transition-colors">{label}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <ChevronRight size={18} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
  </div>
);

const StatCard = ({ label, value, icon }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
    <div className="flex items-center justify-between mb-2">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <div className="p-2 bg-slate-800 rounded-lg">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold tracking-tight">{value}</div>
  </div>
);

export default App;

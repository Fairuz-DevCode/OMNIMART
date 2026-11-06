import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Footprints, Menu, Search, ShoppingBag, X, User as UserIcon, Heart } from 'lucide-react';
import { useCart } from '../../modules/cart';
import { useAuth } from '../../modules/auth';

const Navbar: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { getCartCount } = useCart();
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  // if (location.pathname.startsWith('/admin')) {
  //   return null;
  // }

  return (
    <nav className="fixed top-0 left-0 z-50 flex items-center justify-between w-full h-16 bg-white/90 backdrop-blur-md px-4 sm:px-8 text-gray-900 font-body shadow-xs border-b border-gray-100 transition-all">
      {/* Left-Navbar Logo */}
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Footprints className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-lg text-gray-900 tracking-wider font-headline leading-none">
              NEXA<span className="text-blue-600">.</span>
            </h1>
            <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase font-label">
              Streetwear
            </span>
          </div>
        </Link>
      </div>

      {/* Middle Navigation Links */}
      <div className="hidden md:flex items-center gap-1 font-headline">
        {currentUser?.role === 'admin' ? (
          <>
            <Link
              to="/admin/dashboard"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/admin/products"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Manage Produk
            </Link>
            <Link
              to="/admin/orders"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Manage Pesanan
            </Link>
            <Link
              to="/admin/discount"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Manage Discount
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/"
              className="px-3.5 py-2 text-xs font-extrabold rounded-xl text-blue-600 bg-blue-50/80 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/product"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Shop
            </Link>
            <Link
              to="/product?category=Sneakers %26 Kasual"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              to="/product?category=Athletic"
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Collections
            </Link>
          </>
        )}
      </div>

      {/* Right Navbar Icons & Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Search Bar Toggle */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Cari produk..."
            className={`bg-gray-50 text-gray-900 text-xs rounded-full outline-none transition-all duration-300 border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 ${isSearchOpen ? 'w-40 py-1.5 px-3 pr-8 opacity-100' : 'w-0 opacity-0 pointer-events-none'
              }`}
          />
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`flex items-center justify-center cursor-pointer p-2 hover:bg-gray-100 text-gray-700 rounded-full transition-all ${isSearchOpen ? 'absolute right-1' : ''
              }`}
          >
            {isSearchOpen ? <X className="w-4 h-4 text-gray-600" /> : <Search className="w-4 h-4 text-gray-600" />}
          </button>
        </div>

        {/* User Profile / Cart Icons */}
        <div className="flex items-center gap-2">
          {currentUser && (
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-blue-50 cursor-pointer rounded-full transition-colors border border-gray-100"
            >
              <UserIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-800 hidden md:block truncate max-w-28">
                {currentUser.name || (currentUser as any).username || currentUser.email}
              </span>
            </Link>
          )}

          {currentUser && (
            <Link
              to="/wishlist"
              className="flex items-center justify-center cursor-pointer p-2 relative bg-gray-50 hover:bg-rose-50 rounded-full border border-gray-100 transition-colors"
              title="Wishlist Saya"
            >
              <Heart className="text-gray-700 w-4 h-4 hover:text-rose-600" />
            </Link>
          )}

          <Link
            to="/cart"
            className="flex items-center justify-center cursor-pointer p-2 relative bg-gray-50 hover:bg-blue-50 rounded-full border border-gray-100 transition-colors"
          >
            <ShoppingBag className="text-gray-700 w-4 h-4 hover:text-blue-600" />
            {getCartCount() > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {getCartCount()}
              </span>
            )}
          </Link>

          {currentUser ? (
            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className="px-4 py-1.5 text-xs font-extrabold rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-1.5 text-xs font-extrabold rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all"
            >
              Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex items-center justify-center cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu className="text-gray-800 w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="md:hidden absolute right-0 z-50 w-52 mt-2 p-2.5 rounded-2xl shadow-xl bg-white border border-gray-100 space-y-1 text-gray-900 font-headline">
                {currentUser?.role === 'admin' ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/admin/products"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600"
                    >
                      Manage Produk
                    </Link>
                    <Link
                      to="/admin/orders"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600"
                    >
                      Manage Pesanan
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-3 py-2 text-left text-xs font-extrabold rounded-xl bg-blue-50 text-blue-600"
                    >
                      Home
                    </Link>
                    <Link
                      to="/product"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-3 py-2 text-left text-xs font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600"
                    >
                      Shop
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

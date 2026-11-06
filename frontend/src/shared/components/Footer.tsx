import React from 'react';
import { useLocation } from 'react-router-dom';
import { Send } from 'lucide-react';
import { InstagramIcon, FacebookIcon, TwitterIcon, YoutubeIcon } from '../../assets/icons/SocialIcons';

const Footer: React.FC = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-[#111111] text-gray-300 py-16 w-full mt-auto border-t border-gray-900">
      <div className="mx-5 px-5 md:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:px-15 xl:px-30">

        {/* Brand Column */}
        <div className="lg:col-span-1">
          <h2 className="text-white text-2xl font-bold mb-4 tracking-wide">StrideX</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed pr-4">
            Step into style and performance. Premium sneakers from top brands, made for every move.
          </p>
          <div className="flex gap-4">
            <InstagramIcon size={20} className="hover:text-white cursor-pointer transition-colors" />
            <FacebookIcon size={20} className="hover:text-white cursor-pointer transition-colors" />
            <TwitterIcon size={20} className="hover:text-white cursor-pointer transition-colors" />
            <YoutubeIcon size={20} className="hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Shop Column */}
        <div>
          <h3 className="text-white font-semibold mb-5 text-sm tracking-wide">Shop</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors">Men</li>
            <li className="hover:text-white cursor-pointer transition-colors">Women</li>
            <li className="hover:text-white cursor-pointer transition-colors">Kids</li>
            <li className="hover:text-white cursor-pointer transition-colors">Brands</li>
            <li className="hover:text-white cursor-pointer transition-colors">Sale</li>
            <li className="hover:text-white cursor-pointer transition-colors">New Arrivals</li>
          </ul>
        </div>

        {/* Customer Care Column */}
        <div>
          <h3 className="text-white font-semibold mb-5 text-sm tracking-wide">Customer Care</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors">Contact Us</li>
            <li className="hover:text-white cursor-pointer transition-colors">FAQ</li>
            <li className="hover:text-white cursor-pointer transition-colors">Shipping & Delivery</li>
            <li className="hover:text-white cursor-pointer transition-colors">Returns</li>
            <li className="hover:text-white cursor-pointer transition-colors">Size Guide</li>
          </ul>
        </div>

        {/* About Us Column */}
        <div>
          <h3 className="text-white font-semibold mb-5 text-sm tracking-wide">About Us</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors">Our Story</li>
            <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
            <li className="hover:text-white cursor-pointer transition-colors">Sustainability</li>
            <li className="hover:text-white cursor-pointer transition-colors">Press</li>
            <li className="hover:text-white cursor-pointer transition-colors">Affiliates</li>
          </ul>
        </div>

        {/* Newsletter Column */}
        <div className="lg:col-span-1">
          <h3 className="text-white font-semibold mb-5 text-sm tracking-wide">Stay in the Loop</h3>
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Sign up for exclusive offers, new arrivals, and more.
          </p>
          <div className="relative flex items-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-[#1a1a1a] border border-gray-800 text-sm text-white px-4 py-3 rounded-lg focus:outline-none focus:border-gray-500 transition-colors"
            />
            <button className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer">
              <Send size={18} />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

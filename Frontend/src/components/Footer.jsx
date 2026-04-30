const Footer = () => {
    return (
      <footer className="bg-[#FFA500] text-white py-6 px-4 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-4 md:space-y-0">
          <div>
            <h2 className="text-xl font-bold">🐾 My FurryFriends</h2>
            <p className="text-sm">Because every paw deserves a home.</p>
          </div>
  
          <div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} My FurryFriends. All rights reserved.
            </p>
          </div>
  
          <div className="flex space-x-4">
            <a href="#" className="hover:underline hover:text-black">Contact Us</a>
          </div>
        </div>
      </footer>
    );
  };
  
  export default Footer;
  
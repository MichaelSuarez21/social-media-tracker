export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Social Media Tracker
        </h1>
        <p className="text-xl mb-8 text-gray-300">
          Monitor all your social media accounts in one place. Track growth, analyze trends, and gain insights across platforms.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a 
            href="/signup" 
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Get Started
          </a>
          <button className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors">
            Learn More
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Track Multiple Platforms</h3>
            <p className="text-gray-400">Connect Twitter, Facebook, Instagram, YouTube, Pinterest, BlueSky, Twitch and more.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Visualize Growth</h3>
            <p className="text-gray-400">See your performance trends across daily, weekly, and monthly timeframes.</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Unified Dashboard</h3>
            <p className="text-gray-400">View all your social media analytics in one clean, intuitive interface.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

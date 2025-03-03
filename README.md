# Social Media Tracker

A comprehensive dashboard for tracking and analyzing your social media performance across multiple platforms.

## Features

- **Unified Dashboard**: View all your social media analytics in one place
- **Multi-Platform Support**: Track Twitter, Instagram, Facebook, YouTube, Pinterest, Twitch, TikTok, BlueSky and more
- **Performance Metrics**: Monitor followers, views, engagement rates, and growth trends
- **Secure Authentication**: User accounts with Supabase authentication
- **Responsive Design**: Beautiful, dark-themed UI that works on all devices

## Tech Stack

- **Frontend**: Next.js 15 with React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication & Backend**: Supabase
- **Data Visualization**: Chart.js with react-chartjs-2

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/social-media-tracker.git
cd social-media-tracker
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Social Media Platform Integration

This application connects to various social media platforms through their official APIs. You will need to create developer accounts and obtain API credentials for each platform you wish to integrate.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

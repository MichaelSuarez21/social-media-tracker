# Social Media Tracker

A comprehensive platform for tracking metrics across various social media accounts.

## Features

- Connect to multiple social media platforms (YouTube, with more coming soon)
- Automatically collect and store metrics
- View metrics history and trends
- Analyze engagement across platforms
- Schedule automatic metric collection via cron jobs

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- A Supabase account
- API keys for the social platforms you want to support

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/social-media-tracker.git
   cd social-media-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your API keys and configuration.

4. Run database migrations:
   ```bash
   npm run db:migrate
   # or
   yarn db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Metrics Refresh System

The application includes an automated metrics refresh system that periodically fetches fresh data from connected social platforms.

### How It Works

1. A scheduled cron job calls the `/api/cron/refresh-metrics` endpoint
2. The endpoint fetches all connected social accounts
3. For each account:
   - Checks if tokens need refreshing
   - Fetches fresh metrics from the respective platform APIs
   - Stores metrics in the database
   - Updates account metadata

### Setting Up the Cron Job

#### Option 1: Vercel Deployment (Recommended)

If deploying to Vercel:

1. Ensure the `vercel.json` file is in the root directory with the cron configuration
2. Add the `METRICS_REFRESH_API_KEY` environment variable in your Vercel project settings
3. Deploy your application to Vercel
4. Vercel will automatically set up the cron job based on the configuration

#### Option 2: Manual Testing

You can manually trigger the cron job using the provided test script:

```bash
# Set the API key in your .env.local file first
npm run test:cron
# or with custom URL and key
npm run test:cron -- --url https://your-deployment-url.com --key your-api-key
```

#### Option 3: External Cron Service

You can use an external service to call the endpoint periodically:

1. Set up a service like [Pipedream](https://pipedream.com/) or [Cronhooks](https://cronhooks.io/)
2. Configure it to make a GET request to:
   ```
   https://your-deployment-url.com/api/cron/refresh-metrics?key=your-api-key
   ```

See the [cron setup documentation](docs/cron-setup.md) for more detailed instructions.

## Database Setup

The application uses Supabase for the database. You'll need to run migrations to set up the necessary tables and functions.

```bash
# Run all migrations
npm run db:migrate

# Run only schema migrations
npm run db:migrate:schema

# Run only function migrations
npm run db:migrate:functions
```

See the [database documentation](db/README.md) for more details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

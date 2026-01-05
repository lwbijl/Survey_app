# Multi-Workshop Survey Application

A web-based survey application built with React and Supabase for managing surveys across multiple workshops with up to 140 participants.

## Features

- **Admin Panel**: Create and manage survey questions with multiple question types
- **Survey Interface**: User-friendly form for participants to submit responses
- **Results Dashboard**: View aggregate results with charts and filters
- **Data Export**: Export survey results to CSV
- **Text Formatting**: Support for bold, italic, and underline formatting in questions

## Technology Stack

- React (with hooks)
- Supabase (backend database)
- Recharts (data visualization)
- Tailwind CSS (styling)
- CSV export functionality

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- A Supabase account and project

### Installation

1. The project is already set up in the `survey-app` directory

2. Install dependencies (if needed):
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon API key from Project Settings > API

### 2. Create Database Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Table: survey_questions
CREATE TABLE survey_questions (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  scale_min INT,
  scale_max INT,
  multiple_select BOOLEAN,
  percentage_max INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: survey_responses
CREATE TABLE survey_responses (
  id BIGSERIAL PRIMARY KEY,
  respondent_id TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  role TEXT NOT NULL,
  answers JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Configure the Application

When you first open the application, you'll see a configuration screen:

1. Enter your Supabase Project URL (e.g., `https://your-project.supabase.co`)
2. Enter your Supabase Anon API Key
3. Click "Save Configuration"

The configuration is stored in your browser's localStorage.

## Usage Guide

### Admin View

**Creating Questions:**

1. Navigate to the "Admin" tab
2. Enter your question text (supports formatting):
   - `**text**` for bold
   - `*text*` for italic
   - `__text__` for underline
3. Select question type:
   - **Scale**: Numeric rating (configure min/max values)
   - **Select Options**: Single or multiple choice (one option per line)
   - **Free Text**: Open-ended text response
   - **Percentage**: Numeric input with configurable maximum
4. Click "Add Question" to add to the list
5. Click "Save All Questions" to persist to database

**Managing Questions:**

- Preview questions before saving
- Delete questions using the trash icon
- Questions are numbered automatically (Q1, Q2, etc.)

### Survey View

**Filling Out a Survey:**

1. Navigate to the "Survey" tab
2. Enter participant information (all required):
   - Name
   - Country Code (for workshop identification)
   - Role (Claims, SUWS, HQ, IT, Investment)
3. Answer all questions
4. Click "Submit Survey"

**Question Types:**

- **Scale**: Click the numeric button for your rating
- **Single Select**: Choose one radio button option
- **Multiple Select**: Check multiple checkboxes
- **Free Text**: Type your response in the text area
- **Percentage**: Enter a numeric value within the allowed range

### Results View

**Filtering Results:**

1. Navigate to the "Results" tab
2. Use filters to view specific data:
   - Country/Workshop filter
   - Role filter
3. Response count updates based on filters

**Viewing Data:**

- **Aggregate Results**: Charts showing summarized data
  - Scale questions: Bar chart of response distribution
  - Select questions: Bar chart of option counts
  - Percentage questions: Bar chart showing average
  - Text questions: List of all responses with respondent info
- **Individual Responses**: Card view of each submission with all answers

**Exporting Data:**

1. Apply desired filters
2. Click "Export to CSV" button
3. File downloads with format: `survey_results_YYYY-MM-DD.csv`
4. Includes: Name, Country, Role, Timestamp, Q1, Q2, Q3, etc.

## Project Structure

```
survey-app/
├── src/
│   ├── components/
│   │   ├── AdminView.jsx       # Question creation interface
│   │   ├── SurveyView.jsx      # Participant survey form
│   │   ├── ResultsView.jsx     # Results dashboard
│   │   └── ConfigScreen.jsx    # Supabase configuration
│   ├── utils/
│   │   ├── supabase.js         # Supabase API functions
│   │   └── formatText.js       # Text formatting utility
│   ├── App.js                  # Main app with navigation
│   ├── index.js                # Entry point
│   └── index.css               # Tailwind styles
├── public/
├── package.json
└── README.md
```

## API Functions

### Supabase Utilities (`src/utils/supabase.js`)

- `getSupabaseConfig()` - Retrieve stored config
- `saveSupabaseConfig(url, key)` - Save config to localStorage
- `isSupabaseConfigured()` - Check if config exists
- `getQuestions()` - Fetch all questions
- `saveQuestions(questions)` - Save/update questions
- `getResponses()` - Fetch all survey responses
- `saveResponse(response)` - Save a new response

### Text Formatting (`src/utils/formatText.js`)

- `renderFormattedText(text)` - Convert markdown-style formatting to HTML

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Deploy to Netlify

1. Push your code to a Git repository
2. Connect repository to Netlify
3. Build command: `npm run build`
4. Publish directory: `build`
5. Deploy!

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Follow the prompts to deploy.

## Key Implementation Details

### State Management

- Questions and responses loaded from Supabase
- Local state for form inputs (prevents focus loss)
- Filters applied client-side for performance

### Data Storage

- Questions stored with snake_case in database
- Converted to camelCase in JavaScript
- Answers stored as JSONB for flexibility

### Validation

- All participant fields required
- All questions must be answered
- Percentage values validated against max
- Multiple select requires at least one option

### CSV Export

- Headers: Name, Country, Role, Timestamp, Q1, Q2, ...
- Multiple select answers joined with semicolons
- Date format: localized string

## Troubleshooting

### "Failed to load questions"

- Check Supabase credentials
- Verify tables exist in database
- Check browser console for errors

### "Failed to submit survey"

- Ensure all fields are filled
- Check Supabase connection
- Verify table permissions in Supabase

### Styling Issues

- Clear browser cache
- Check Tailwind CSS is installed: `npm list tailwindcss`
- Restart development server

### Focus Lost While Typing

- Each view component manages its own state
- Input fields should not lose focus during typing
- If this occurs, check for parent re-renders

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT

## Support

For issues or questions, please contact your administrator.

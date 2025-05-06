# Gospel Labour Ministry Church Management System

A comprehensive church management system designed for Gospel Labour Ministry to streamline administrative tasks, enhance member engagement, and support pastoral care. This platform connects members, pastors, and the Apostle to efficiently manage church operations and ministry activities.

## Key Features

- **Member Management**: Track and manage church members' information, attendance, and participation
- **Pastoral Care**: Assign members to pastors for spiritual guidance and follow-up
- **Church Units**: Organize members by ministry units (3H Media, 3H Music, etc.)
- **Auxano Groups**: Manage small discipleship groups for spiritual growth
- **Admin Dashboard**: Comprehensive tools for church leadership to oversee all aspects of ministry
- **User Profiles**: Personalized profiles for members with relevant church information
- **Role-Based Access**: Different permission levels for members, pastors, admins, and the Apostle

## Technologies Used

This project is built with:

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn-ui, Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **State Management**: React Context API, React Query

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone https://github.com/glmite25/glmhome.git

# Navigate to the project directory
cd glmhome

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at [http://localhost:8080](http://localhost:8080)

## Building for Production

```sh
npm run build
```

## Preview Production Build

```sh
npm run preview
```

## User Roles

- **Members**: Regular church members who can view their profiles, assigned pastor, and church unit
- **Pastors**: Church leaders who can manage their assigned members and provide spiritual care
- **Admins**: Staff with access to manage members, events, and basic church operations
- **Super Admin (Apostle)**: Complete access to all system features and administrative functions

## Church Units

The system supports various ministry units including:

- 3H Media
- 3H Music
- 3H Movies
- 3H Security
- Discipleship
- Praise Feet
- Cloven Tongues
- Auxano Groups

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## About Gospel Labour Ministry

Gospel Labour Ministry is dedicated to spreading God's love through worship, community, and service. Our mission is to equip believers for effective ministry and to build a community of faith that impacts the world for Christ.

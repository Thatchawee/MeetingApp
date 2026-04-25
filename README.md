# Meeting Time Arrangement App (DES422)

## Overview
This web application helps users find a common available time for meetings by comparing availability across multiple participants.

## Features
- User Signup & Login
- Create Meeting
- Invite Users by Username
- Accept / Decline Invitations
- Select Available Time Slots (1-hour interval)
- Highlight Overlapping Time (Intersection)

## Tech Stack
- React (Vite)
- Supabase (Auth + Database)
- Vercel (Deployment)

## Live Demo
https://meeting-app-lime-nine.vercel.app

## How to Run Locally
```bash
npm install
npm run dev

##Notes
The system calculates the intersection of all participants' available time slots and highlights the optimal meeting time.

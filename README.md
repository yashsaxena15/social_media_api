# Social Media API

A backend API for a social media platform built using Django REST Framework.

This project demonstrates core backend features such as authentication, posts, likes, comments, follow system, feed generation, search, pagination, and API documentation.

---

## Live API

Base URL  
https://social-media-api-5352.onrender.com

Swagger Documentation  
https://social-media-api-5352.onrender.com/api/docs/

#### ⚠️ Note: This API is deployed on Render free tier, so the first request may take ~30 seconds due to cold start.
---

## Features

- User Registration
- JWT Authentication
- User Profile System
- Create / Update / Delete Posts
- Like System
- Comment System
- Follow / Followers
- Feed (Posts from followed users)
- Global Search (users + posts)
- Pagination
- API Throttling
- Swagger API Documentation

---

## Tech Stack

Backend:
- Python
- Django
- Django REST Framework

Authentication:
- JWT (SimpleJWT)

Database:
- MySQL

API Documentation:
- drf-spectacular (Swagger)

Deployment:
- Render

---

## API Endpoints

### Authentication

- POST /api/register/
- POST /api/token/
- POST /api/token/refresh/
- POST /api/logout-user/


### Profile

- GET /api/profile/
- PATCH /api/profile-update/


### Posts

- POST /api/create-post/
- GET /api/post-list/
- GET /api/post-detail/{post_id}/
- PATCH /api/update-post/{post_id}/
- DELETE /api/delete-post/{post_id}/


### Likes

- POST /api/posts/{post_id}/like/

### Comments


- POST /api/posts/{post_id}/create-comment/
- GET /api/posts/{post_id}/list-comments/
- PATCH /api/comments/{comment_id}/update-comment/
- DELETE /api/comments/{comment_id}/delete-comment/

### Follow System

- POST /api/follow/{user_id}/
- GET /api/following-list/{user_id}/
- GET /api/follower-list/{user_id}/


### Feed


- GET /api/feed/


### Search


- GET /api/search/?q=query
- GET /api/search/?q=query&type=users
- GET /api/search/?q=query&type=posts

---

## API Documentation

- Swagger UI: /api/docs/

- ReDoc: /api/redoc/

---

## Installation

Clone the repository

```bash
git clone https://github.com/yashsaxena15/social-media-api.git
cd social-media-api
```

Install dependencies

```bash
poetry install
```

Apply migrations

```bash
poetry run python manage.py migrate
```

Run the development server

```bash
poetry run python manage.py runserver
```

---

## Environment Variables

Create a `.env` file and add:

```env
SECRET_KEY=your_secret_key
DEBUG=True

DB_NAME=social_media_db
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=3306
```

---

## Future Improvements

- Redis caching
- Docker support
- Notifications system

---

## Author

Yash Saxena  
Computer Science Engineer

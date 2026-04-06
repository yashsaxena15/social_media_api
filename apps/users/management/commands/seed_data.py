import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from faker import Faker

from apps.users.models import Profile, Follow
from apps.posts.models import Post, Comment, Like

User = get_user_model()
fake = Faker()


class Command(BaseCommand):
    help = "Seed database with sample social media data"

    def handle(self, *args, **kwargs):

        self.stdout.write("Creating Users...")

        users = []

        for i in range(10):
            username = fake.user_name()

            # Avoid duplicate usernames
            while User.objects.filter(username=username).exists():
                username = fake.user_name()

            user = User.objects.create_user(
                username=username,
                email=fake.email(),
                password="password123"
            )

            # Fix duplicate profile issue
            profile, created = Profile.objects.get_or_create(user=user)

            profile.full_name = fake.name()
            profile.bio = fake.sentence()
            profile.save()

            users.append(user)

        self.stdout.write(self.style.SUCCESS("Users created"))

        # ---------------- Follow Relationships ----------------

        self.stdout.write("Creating Follow relationships...")

        for user in users:
            following = random.sample(users, random.randint(1, 5))

            for follow_user in following:
                if user != follow_user:
                    Follow.objects.get_or_create(
                        follower=user,
                        following=follow_user
                    )

        self.stdout.write(self.style.SUCCESS("Follow relationships created"))

        # ---------------- Create Posts ----------------

        self.stdout.write("Creating Posts...")

        posts = []

        for user in users:
            for _ in range(random.randint(3, 8)):
                post = Post.objects.create(
                    user=user,
                    caption=fake.sentence()
                )
                posts.append(post)

        self.stdout.write(self.style.SUCCESS("Posts created"))

        # ---------------- Create Likes ----------------

        self.stdout.write("Creating Likes...")

        for post in posts:
            likers = random.sample(users, random.randint(1, 6))

            for user in likers:
                Like.objects.get_or_create(
                    user=user,
                    post=post
                )

        self.stdout.write(self.style.SUCCESS("Likes created"))

        # ---------------- Create Comments ----------------

        self.stdout.write("Creating Comments...")

        for post in posts:
            for _ in range(random.randint(2, 6)):
                Comment.objects.create(
                    user=random.choice(users),
                    post=post,
                    text=fake.sentence()
                )

        self.stdout.write(self.style.SUCCESS("Comments created"))

        self.stdout.write(
            self.style.SUCCESS("Database seeded successfully 🚀")
        )
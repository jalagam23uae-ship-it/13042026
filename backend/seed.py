"""Run: docker-compose exec backend python seed.py

Requires SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_INSTRUCTOR_PASSWORD,
SEED_STUDENT_PASSWORD environment variables. No hardcoded credentials.
"""
import os
import sys
from app.database import SessionLocal, engine, Base
from app.models import *  # noqa
from app.services.auth_service import hash_password
from app.models.user import User
from app.models.course import Course
from app.models.session import Session
from app.models.test import Test, Question
from app.models.enrollment import Enrollment
from app.models.notification import Notification
from app.models.lesson import Lesson
from app.models.assignment import Assignment
from app.models.announcement import Announcement
from app.models.learning_path import LearningPath, LearningPathCourse
from datetime import datetime, timedelta


def _require_env(name: str, min_len: int = 12) -> str:
    value = os.environ.get(name, "")
    if not value or len(value) < min_len:
        print(
            f"ERROR: {name} environment variable must be set and at least "
            f"{min_len} characters.",
            file=sys.stderr,
        )
        sys.exit(2)
    return value


ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@lms.com").strip().lower()
ADMIN_PASSWORD = _require_env("SEED_ADMIN_PASSWORD")
INSTRUCTOR_PASSWORD = _require_env("SEED_INSTRUCTOR_PASSWORD")
STUDENT_PASSWORD = _require_env("SEED_STUDENT_PASSWORD")

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Check if already seeded
if db.query(User).first():
    print("Database already seeded, skipping.")
    db.close()
    exit(0)

# Users
admin = User(name="Admin User", email=ADMIN_EMAIL, password=hash_password(ADMIN_PASSWORD), role="admin")
inst  = User(name="Dr. Rajan", email="rajan@lms.com", password=hash_password(INSTRUCTOR_PASSWORD), role="instructor")
u1    = User(name="Sarah Mitchell", email="sarah@lms.com", password=hash_password(STUDENT_PASSWORD), role="student")
u2    = User(name="James Kumar", email="james@lms.com", password=hash_password(STUDENT_PASSWORD), role="student")
u3    = User(name="Priya Lal", email="priya@lms.com", password=hash_password(STUDENT_PASSWORD), role="student")
db.add_all([admin, inst, u1, u2, u3]); db.commit()

# Courses
c1 = Course(title="Python Fundamentals", description="Core Python programming", category="Programming")
c2 = Course(title="Data Structures & Algorithms", description="DSA in Python", category="Programming")
c3 = Course(title="Database Design (PostgreSQL)", description="SQL & PostgreSQL", category="Database")
c4 = Course(title="React Development", description="Frontend with React 18", category="Web Development")
c5 = Course(title="FastAPI Backend", description="REST APIs with FastAPI", category="Web Development")
db.add_all([c1, c2, c3, c4, c5]); db.commit()

# Enrollments
enrollments = [
    Enrollment(user_id=u1.id, course_id=c1.id),
    Enrollment(user_id=u1.id, course_id=c2.id),
    Enrollment(user_id=u1.id, course_id=c3.id),
    Enrollment(user_id=u2.id, course_id=c1.id),
    Enrollment(user_id=u2.id, course_id=c4.id),
    Enrollment(user_id=u3.id, course_id=c1.id),
    Enrollment(user_id=u3.id, course_id=c5.id),
]
db.add_all(enrollments); db.commit()

now = datetime.utcnow()
# Sessions
sessions = [
    Session(title="Python Basics - Day 1", instructor="Dr. Rajan", course_id=c1.id, start_time=now-timedelta(days=20), end_time=now-timedelta(days=20, hours=-4), duration_hrs=4, status="completed", created_by=admin.id),
    Session(title="Python Basics - Day 2", instructor="Dr. Rajan", course_id=c1.id, start_time=now-timedelta(days=18), end_time=now-timedelta(days=18, hours=-4), duration_hrs=4, status="completed", created_by=admin.id),
    Session(title="Data Structures Intro", instructor="Ms. Chen", course_id=c2.id, start_time=now-timedelta(days=14), end_time=now-timedelta(days=14, hours=-3), duration_hrs=3, status="completed", created_by=admin.id),
    Session(title="SQL Basics Workshop", instructor="Ms. Chen", course_id=c3.id, start_time=now-timedelta(days=7), end_time=now-timedelta(days=7, hours=-3), duration_hrs=3, status="completed", created_by=admin.id),
    Session(title="React Introduction", instructor="Mr. Patel", course_id=c4.id, start_time=now+timedelta(days=2), end_time=now+timedelta(days=2, hours=4), duration_hrs=4, status="upcoming", created_by=admin.id),
    Session(title="FastAPI Deep Dive", instructor="Dr. Rajan", course_id=c5.id, start_time=now+timedelta(days=7), end_time=now+timedelta(days=7, hours=3), duration_hrs=3, status="upcoming", created_by=admin.id),
]
db.add_all(sessions); db.commit()

# Tests
t1 = Test(title="Python Basics Quiz", course_id=c1.id, pass_mark=60, duration_min=20)
t2 = Test(title="DSA Mid-Test", course_id=c2.id, pass_mark=60, duration_min=30)
t3 = Test(title="SQL Fundamentals", course_id=c3.id, pass_mark=60, duration_min=25)
db.add_all([t1, t2, t3]); db.commit()

q1 = Question(test_id=t1.id, body="Which keyword is used to define a function in Python?", option_a="func", option_b="def", option_c="function", option_d="define", correct_opt="B")
q2 = Question(test_id=t1.id, body="What data type is mutable in Python?", option_a="tuple", option_b="string", option_c="list", option_d="int", correct_opt="C")
q3 = Question(test_id=t1.id, body="What does len() return?", option_a="Last index", option_b="Sum", option_c="Number of elements", option_d="Data type", correct_opt="C")
q4 = Question(test_id=t2.id, body="What is the time complexity of binary search?", option_a="O(n)", option_b="O(n^2)", option_c="O(log n)", option_d="O(1)", correct_opt="C")
q5 = Question(test_id=t2.id, body="Which data structure uses LIFO?", option_a="Queue", option_b="Stack", option_c="Tree", option_d="Graph", correct_opt="B")
q6 = Question(test_id=t3.id, body="Which SQL clause filters after grouping?", option_a="WHERE", option_b="HAVING", option_c="FILTER", option_d="GROUP BY", correct_opt="B")
q7 = Question(test_id=t3.id, body="Which JOIN returns all rows from both tables?", option_a="INNER JOIN", option_b="LEFT JOIN", option_c="FULL OUTER JOIN", option_d="CROSS JOIN", correct_opt="C")
db.add_all([q1, q2, q3, q4, q5, q6, q7]); db.commit()

# Lessons (course content)
lessons = [
    # Python Fundamentals
    Lesson(course_id=c1.id, title="Introduction to Python", description="Overview of Python programming language, its history, and why it's popular.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=15, sort_order=1),
    Lesson(course_id=c1.id, title="Variables and Data Types", description="Learn about integers, floats, strings, booleans, and type conversion.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4", content_type="video", duration_min=20, sort_order=2),
    Lesson(course_id=c1.id, title="Control Flow: If/Else", description="Conditional statements, comparison operators, and logical operators.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=18, sort_order=3),
    Lesson(course_id=c1.id, title="Loops: For and While", description="Iteration, range(), break, continue, and nested loops.", content_type="article", duration_min=12, sort_order=4),
    Lesson(course_id=c1.id, title="Functions and Modules", description="Defining functions, parameters, return values, and importing modules.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4", content_type="video", duration_min=25, sort_order=5),
    Lesson(course_id=c1.id, title="Lists, Tuples, and Dictionaries", description="Working with Python's built-in data structures.", content_type="article", duration_min=15, sort_order=6),
    # Data Structures & Algorithms
    Lesson(course_id=c2.id, title="Big-O Notation", description="Understanding time and space complexity analysis.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=20, sort_order=1),
    Lesson(course_id=c2.id, title="Arrays and Linked Lists", description="Linear data structures, operations, and trade-offs.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4", content_type="video", duration_min=25, sort_order=2),
    Lesson(course_id=c2.id, title="Stacks and Queues", description="LIFO and FIFO data structures with real-world examples.", content_type="video", duration_min=18, sort_order=3),
    Lesson(course_id=c2.id, title="Binary Search", description="Divide and conquer approach to searching sorted arrays.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=15, sort_order=4),
    # Database Design
    Lesson(course_id=c3.id, title="Introduction to SQL", description="Database concepts, tables, rows, columns, and basic queries.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=20, sort_order=1),
    Lesson(course_id=c3.id, title="SELECT, WHERE, and ORDER BY", description="Filtering and sorting data from tables.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4", content_type="video", duration_min=18, sort_order=2),
    Lesson(course_id=c3.id, title="JOINs and Relationships", description="Combining data from multiple tables using different JOIN types.", content_type="video", duration_min=25, sort_order=3),
    Lesson(course_id=c3.id, title="GROUP BY and Aggregations", description="Aggregate functions: COUNT, SUM, AVG, MIN, MAX with grouping.", content_type="article", duration_min=15, sort_order=4),
    # React Development
    Lesson(course_id=c4.id, title="React Fundamentals", description="Components, JSX, props, and the virtual DOM.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=22, sort_order=1),
    Lesson(course_id=c4.id, title="State and Hooks", description="useState, useEffect, and the rules of hooks.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4", content_type="video", duration_min=28, sort_order=2),
    Lesson(course_id=c4.id, title="Routing with React Router", description="Client-side routing, navigation, and URL parameters.", content_type="video", duration_min=20, sort_order=3),
    # FastAPI Backend
    Lesson(course_id=c5.id, title="FastAPI Getting Started", description="Setting up FastAPI, creating your first endpoint.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", content_type="video", duration_min=15, sort_order=1),
    Lesson(course_id=c5.id, title="Path and Query Parameters", description="Handling URL parameters and query strings.", content_type="video", duration_min=18, sort_order=2),
    Lesson(course_id=c5.id, title="Database with SQLAlchemy", description="ORM setup, models, and CRUD operations.", video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4", content_type="video", duration_min=30, sort_order=3),
]
db.add_all(lessons); db.commit()

# Assignments
assignments = [
    Assignment(course_id=c1.id, title="Python Basics Homework", description="Write a program that implements a calculator with +, -, *, / operations. Handle division by zero.", due_date=now+timedelta(days=14), max_score=100),
    Assignment(course_id=c2.id, title="Implement a Stack", description="Implement a stack data structure with push, pop, peek, and is_empty methods. Include unit tests.", due_date=now+timedelta(days=21), max_score=100),
    Assignment(course_id=c3.id, title="SQL Query Challenge", description="Write SQL queries to solve the 5 problems in the attached document. Submit your .sql file.", due_date=now+timedelta(days=10), max_score=50),
]
db.add_all(assignments); db.commit()

# Announcements
db.add_all([
    Announcement(title="Welcome to ATP!", content="We're excited to have you. Start by exploring available courses and enrolling in topics that interest you.", author_id=admin.id, is_pinned=True),
    Announcement(title="Python Course Updated", content="New lessons have been added to the Python Fundamentals course including Functions and Data Structures.", author_id=admin.id, course_id=c1.id),
    Announcement(title="Upcoming: React Workshop", content="A live React workshop session is scheduled for next week. Make sure to enroll in the React Development course.", author_id=admin.id, course_id=c4.id),
]); db.commit()

# Learning Paths
lp1 = LearningPath(title="Full-Stack Python Developer", description="Master Python, databases, and web APIs to become a full-stack developer.")
lp2 = LearningPath(title="Frontend Web Developer", description="Learn React and modern frontend development from scratch.")
db.add_all([lp1, lp2]); db.commit()
db.add_all([
    LearningPathCourse(path_id=lp1.id, course_id=c1.id, sort_order=0),
    LearningPathCourse(path_id=lp1.id, course_id=c2.id, sort_order=1),
    LearningPathCourse(path_id=lp1.id, course_id=c3.id, sort_order=2),
    LearningPathCourse(path_id=lp1.id, course_id=c5.id, sort_order=3),
    LearningPathCourse(path_id=lp2.id, course_id=c4.id, sort_order=0),
    LearningPathCourse(path_id=lp2.id, course_id=c5.id, sort_order=1),
]); db.commit()

# Welcome notifications
for u in [u1, u2, u3]:
    db.add(Notification(
        user_id=u.id,
        title="Welcome to ATP!",
        message="Start by exploring your enrolled courses and upcoming sessions.",
        type="info",
        link="/dashboard",
    ))
db.commit()

print(f"Seed complete. Admin email: {ADMIN_EMAIL}")
db.close()

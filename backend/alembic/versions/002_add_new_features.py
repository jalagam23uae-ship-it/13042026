"""Add new features: course metadata, sections, time tracking, approvals, enrollment timestamps

Revision ID: 002
Revises: 001
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # ── Course metadata fields ────────────────────────────────────
    op.add_column('courses', sa.Column('learning_outcomes', sa.Text()))
    op.add_column('courses', sa.Column('requirements', sa.Text()))
    op.add_column('courses', sa.Column('tags', sa.String(500)))
    op.add_column('courses', sa.Column('total_hours', sa.Numeric(5, 1), server_default='0'))
    op.add_column('courses', sa.Column('total_articles', sa.Integer(), server_default='0'))
    op.add_column('courses', sa.Column('total_exercises', sa.Integer(), server_default='0'))
    op.add_column('courses', sa.Column('total_resources', sa.Integer(), server_default='0'))
    op.add_column('courses', sa.Column('has_certificate', sa.Boolean(), server_default='true'))

    # ── Sections table (lesson grouping) ──────────────────────────
    op.create_table('sections',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
    )

    # ── Lesson: add section_id ────────────────────────────────────
    op.add_column('lessons', sa.Column('section_id', sa.Integer(), sa.ForeignKey('sections.id'), nullable=True))

    # ── Enrollment timestamps ─────────────────────────────────────
    op.add_column('enrollments', sa.Column('completed_at', sa.DateTime(timezone=True)))
    op.add_column('enrollments', sa.Column('last_accessed_at', sa.DateTime(timezone=True)))

    # ── User login sessions (time tracking) ───────────────────────
    op.create_table('user_login_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('login_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('logout_at', sa.DateTime(timezone=True)),
        sa.Column('duration_minutes', sa.Numeric(8, 2), server_default='0'),
        sa.Column('ip_address', sa.String(50)),
    )

    # ── Course view times ─────────────────────────────────────────
    op.create_table('course_view_times',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id'), nullable=False),
        sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('ended_at', sa.DateTime(timezone=True)),
        sa.Column('duration_minutes', sa.Numeric(8, 2), server_default='0'),
    )

    # ── Approval requests ─────────────────────────────────────────
    op.create_table('approval_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('type', sa.String(30), nullable=False),
        sa.Column('requester_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('reviewer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('comments', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('reviewed_at', sa.DateTime(timezone=True)),
    )


def downgrade():
    op.drop_table('approval_requests')
    op.drop_table('course_view_times')
    op.drop_table('user_login_sessions')
    op.drop_column('enrollments', 'last_accessed_at')
    op.drop_column('enrollments', 'completed_at')
    op.drop_column('lessons', 'section_id')
    op.drop_table('sections')
    op.drop_column('courses', 'has_certificate')
    op.drop_column('courses', 'total_resources')
    op.drop_column('courses', 'total_exercises')
    op.drop_column('courses', 'total_articles')
    op.drop_column('courses', 'total_hours')
    op.drop_column('courses', 'tags')
    op.drop_column('courses', 'requirements')
    op.drop_column('courses', 'learning_outcomes')

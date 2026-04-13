"""Add start_date / end_date to courses (schema drift fix)

Revision ID: 003
Revises: 002
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('courses', sa.Column('start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('courses', sa.Column('end_date', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('courses', 'end_date')
    op.drop_column('courses', 'start_date')

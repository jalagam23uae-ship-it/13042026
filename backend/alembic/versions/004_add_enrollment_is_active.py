"""add enrollment is_active

Revision ID: 004
Revises: 003
Create Date: 2026-04-14
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'enrollments',
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False)
    )


def downgrade():
    op.drop_column('enrollments', 'is_active')

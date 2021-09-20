
"""empty message

Revision ID: 6650c52670c2
Revises: c465fee44968
Create Date: 2021-07-10 18:12:38.821602

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
from pgadmin import db

revision = '6650c52670c2'
down_revision = 'c465fee44968'
branch_labels = None
depends_on = None


def upgrade():
    db.engine.execute(
        'ALTER TABLE user ADD COLUMN locked BOOLEAN DEFAULT FALSE'
    )
    db.engine.execute(
        'ALTER TABLE user ADD COLUMN login_attempts int DEFAULT 0'
    )


def downgrade():
    # pgAdmin only upgrades, downgrade not implemented.
    pass

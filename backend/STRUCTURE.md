# Backend structure

The backend follows a simple FastAPI layout. Find code by responsibility:

```text
backend/
├── app/
│   ├── main.py             FastAPI app and startup hooks
│   ├── api/routes/         HTTP endpoints grouped by business area
│   │   ├── auth.py         Login, registration and current user
│   │   ├── admin.py        Admin operations and verification
│   │   ├── super_admin.py  Platform governance
│   │   ├── b2b.py          Bulk requests and quotations
│   │   ├── commerce.py     Products, carts, orders and payments
│   │   ├── batches.py      Milk-batch workflows
│   │   ├── iot_ai.py       IoT readings and AI predictions
│   │   ├── catalog.py      Products, farms and marketplace
│   │   ├── analytics.py    Analytics endpoints
│   │   ├── engagement.py   Notifications, subscriptions and complaints
│   │   ├── support.py      Support and chat
│   │   └── uploads.py      File upload endpoints
│   ├── auth/               JWT, password hashing and role guards
│   ├── core/               Settings and rate limiting
│   ├── db/                 SQLAlchemy engine, sessions and Base
│   ├── models/             Database tables and enums
│   ├── schemas/            Pydantic request/response models
│   ├── services/           AI, IoT simulation and background automation
│   └── ml_models/          Trained model files
├── alembic/                Database migrations
├── tests/                  Backend API and database tests
└── requirements.txt        Python dependencies
```

## Where to make changes

- Add or change an API endpoint: `app/api/routes/`
- Add a database table: `app/models/` and then create an Alembic migration
- Add request/response validation: `app/schemas/`
- Add reusable business logic: `app/services/`
- Change environment settings: `app/core/config.py` and `.env`
- Change database setup: `app/db/database.py`

Routes should call services/models through the existing dependency helpers; keep
authentication and database connection code out of individual page workflows.

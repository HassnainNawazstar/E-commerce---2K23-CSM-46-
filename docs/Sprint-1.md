# Sprint 1: Architecture & Scope Definition

**Course:** E-Commerce SDLC  
**Project:** ShelfLife  
**Sprint:** 1 — Planning  
**Roll Number:** 2K23/CSM/46

---

## 1. Target Audience & Market Focus

### Primary Persona

The main users of ShelfLife are people who enjoy reading and want to buy books online. The platform primarily targets students, university learners, regular readers, and individuals looking for books for study, research, or personal reading. A secondary persona is the store admin, who manages inventory and book listings.

### Core Pain Point

Buying books physically is time-consuming because customers may need to visit multiple shops to find a specific title. It is also difficult to check real-time availability, compare prices, and confirm stock before purchase. ShelfLife solves this by providing a single online platform where users can browse, search, add to cart, and order books — while admins manage inventory from one dashboard.

### Domain Scope

ShelfLife operates in the online bookstore and e-commerce book market vertical. The system covers product browsing, category-based organization, cart management, order processing, and administrative inventory control.

---

## 2. Minimum Viable Product (MVP) Feature Scope

The following features are planned for the first version of ShelfLife.

| Category | Feature | Description | Priority |
|---|---|---|---|
| Authentication | User Registration & Login | Users can create an account and log in securely using hashed passwords and JWT-based authentication. | High (MVP) |
| Catalog | Book List & Search | Users can browse all books and search for a specific book by title or author. | High (MVP) |
| Categories | Book Categories | Books are organized into categories such as Fiction, Education, and Programming for taxonomy-based filtering. | High (MVP) |
| Cart | Cart Management | Users can add books to the cart, change quantity, and remove books. Cart state persists across sessions. | High (MVP) |
| Checkout | Order Processing | Users can confirm their cart and create an order. Payment is mocked or integrated via Stripe. | High (MVP) |
| Admin | Inventory Control | Admin can add, update, and remove books and manage available stock via CRUD operations. | Medium |

The MVP is intentionally limited to core shopping workflows so that a functional e-commerce system can be delivered within the academic semester timeline.

---

## 3. Tech Stack Selection & Justification

### Frontend Framework

**Technology:** React.js

**Justification:** React.js is suitable for building a responsive and interactive e-commerce interface with reusable components for the product list, product details, cart, and checkout pages. It is chosen over plain HTML/CSS because it makes the UI easier to organize and scale as the application grows.

### Backend Infrastructure

**Technology:** Node.js with Express.js

**Justification:** Node.js with Express.js provides a lightweight and simple way to build REST APIs for users, products, carts, and orders. Its non-blocking I/O model handles concurrent requests efficiently, and it has a large ecosystem of npm packages for authentication, validation, and database integration.

### Database Management System

**Technology:** PostgreSQL

**Justification:** PostgreSQL is a relational database and is well-suited for ShelfLife because the application contains related entities such as users, products, categories, orders, and cart items. Foreign keys and ACID compliance help maintain data integrity across these relationships. It is preferred over MongoDB because the data is highly structured and relational.

### Caching & Asynchronous Processing (Optional)

**Technology:** Redis

**Justification:** Redis can be used for caching frequently accessed data (such as product listings) and for managing session-related information. It is not required for the basic MVP but can be added later to improve performance under load.

---

## 4. Entity-Relationship Diagram (ERD)

The database design contains the following entities: **Users, Categories, Products, Orders, Order_Items, Carts, and Cart_Items**.

### Relationships

- A **User** can place many **Orders** (1:N)
- A **User** has exactly one **Cart** (1:1)
- A **Category** can contain many **Products** (1:N)
- An **Order** can contain many **Order_Items** (1:N)
- A **Product** can appear in many **Order_Items** (1:N)
- A **Cart** can contain many **Cart_Items** (1:N)
- A **Product** can appear in many **Cart_Items** (1:N)

### Mermaid ERD

```mermaid
erDiagram

    USERS ||--o{ ORDERS : places
    USERS ||--|| CARTS : owns
    CATEGORIES ||--o{ PRODUCTS : contains
    ORDERS ||--o{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : included_in
    CARTS ||--o{ CART_ITEMS : contains
    PRODUCTS ||--o{ CART_ITEMS : added_to

    USERS {
        SERIAL id PK
        VARCHAR(255) email
        VARCHAR(255) password_hash
        VARCHAR(255) name
        TIMESTAMP created_at
    }

    CATEGORIES {
        SERIAL id PK
        VARCHAR(255) name
        TEXT description
    }

    PRODUCTS {
        SERIAL id PK
        INTEGER category_id FK
        VARCHAR(255) name
        TEXT description
        DECIMAL(10,2) price
        INTEGER stock_quantity
        TIMESTAMP created_at
    }

    ORDERS {
        SERIAL id PK
        INTEGER user_id FK
        DECIMAL(10,2) total_amount
        VARCHAR(50) status
        TIMESTAMP created_at
    }

    ORDER_ITEMS {
        SERIAL id PK
        INTEGER order_id FK
        INTEGER product_id FK
        INTEGER quantity
        DECIMAL(10,2) unit_price
    }

    CARTS {
        SERIAL id PK
        INTEGER user_id FK
        TIMESTAMP created_at
    }

    CART_ITEMS {
        SERIAL id PK
        INTEGER cart_id FK
        INTEGER product_id FK
        INTEGER quantity
        TIMESTAMP added_at
    }

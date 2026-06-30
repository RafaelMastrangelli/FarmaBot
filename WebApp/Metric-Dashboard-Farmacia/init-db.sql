CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id serial PRIMARY KEY,
  total_mensagens integer DEFAULT 0,
  total_sessoes integer DEFAULT 0,
  total_pedidos integer DEFAULT 0,
  receita_total real DEFAULT 0,
  transferencias_humano integer DEFAULT 0,
  taxa_conversao text DEFAULT '0',
  ticket_medio text DEFAULT '0',
  gerado_em text,
  recebido_em timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  timestamp text,
  phone text,
  customer_name text,
  step text,
  order_id text,
  order_total real,
  event_type text,
  payment_method text,
  items_json text,
  delivery_address text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date text PRIMARY KEY,
  mensagens integer DEFAULT 0,
  sessoes integer DEFAULT 0,
  pedidos integer DEFAULT 0,
  receita real DEFAULT 0,
  transferencias integer DEFAULT 0,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  order_id text PRIMARY KEY,
  phone text,
  customer_name text,
  order_total real,
  payment_method text,
  delivery_address text,
  items_json text,
  status text DEFAULT 'CONFIRMADO',
  created_at text
);

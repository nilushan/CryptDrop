-- OPTIONAL LOCAL-ONLY fixtures. Run through npm run db:seed:local, never on production.
-- No private key is stored or shipped. This public key is for lookup/encryption demos
-- only; generate your own key pair in the UI to test a decrypt round trip.
-- Reruns only insert missing rows: they never reset invitations or replace keys.

INSERT INTO users (email, name, public_key, fingerprint)
VALUES (
  'local-demo@cryptdrop.invalid',
  'CryptDrop Local Demo',
  '-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEat2FjBYJKwYBBAHaRw8BAQdAPUNcS/eHLtriOB/MVfKAj9rshGWEHRfw
KUySK7+jqKPNM0NyeXB0RHJvcCBMb2NhbCBEZW1vIDxsb2NhbC1kZW1vQGNy
eXB0ZHJvcC5pbnZhbGlkPsLAEwQTFgoAhQWCat2FjAMLCQcJEMB1KMOOInrH
RRQAAAAAABwAIHNhbHRAbm90YXRpb25zLm9wZW5wZ3Bqcy5vcmfnr5ao53GE
sHsjWIKpzr9XPdHL7XX5LInG6rmn1R5MPAUVCggODAQWAAIBAhkBApsDAh4B
FiEEt9etkGo6odWrR+QlwHUow44iescAAMZDAP9SeuI+oJR6a18lEgszQHg9
0/jwsQxUnduyc3dv8Bme3wD/bfocuBKHADNcLoGMWFGpjH7bv0dVSQCdKtwv
rPf/WALOOARq3YWMEgorBgEEAZdVAQUBAQdAhjjU7c0cY5tepDip/QSbYRFx
6O9d5L90bUMzThFJ2AADAQgHwr4EGBYKAHAFgmrdhYwJEMB1KMOOInrHRRQA
AAAAABwAIHNhbHRAbm90YXRpb25zLm9wZW5wZ3Bqcy5vcmeSKIDfM0s3wl1K
jt4B7hJC8uH552WpXaAXeKHMyDbiswKbDBYhBLfXrZBqOqHVq0fkJcB1KMOO
InrHAABLTQEA5cWDDx8QGdmg/QnqW/XhAIKq3NmtBM/uf/y67cInKzkA/2QZ
pX0JLbeVIQJRqEPQEn9mEvcypLYuDn4aKdHCI+0M
=eGDB
-----END PGP PUBLIC KEY BLOCK-----',
  'b7d7ad906a3aa1d5ab47e425c07528c38e227ac7'
)
ON CONFLICT(email) DO NOTHING;

INSERT INTO invitations (token, sender_email, sender_name, recipient_email, status, created_at, accepted_at)
VALUES
  ('local-demo-pending', 'local-sender@cryptdrop.invalid', 'Local Demo Sender', 'local-recipient@cryptdrop.invalid', 'pending', datetime('now'), NULL),
  ('local-demo-accepted', 'local-sender@cryptdrop.invalid', 'Local Demo Sender', 'local-recipient@cryptdrop.invalid', 'accepted', datetime('now'), datetime('now')),
  ('local-demo-expired', 'local-sender@cryptdrop.invalid', 'Local Demo Sender', 'local-recipient@cryptdrop.invalid', 'pending', datetime('now', '-8 days'), NULL)
ON CONFLICT(token) DO NOTHING;

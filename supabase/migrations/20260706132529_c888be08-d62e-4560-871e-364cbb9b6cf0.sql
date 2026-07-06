
CREATE POLICY "Authenticated can read OS attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'service-order-attachments');

CREATE POLICY "Authenticated can upload OS attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-order-attachments');

CREATE POLICY "Authenticated can delete OS attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-order-attachments');

/**
 * Renders schema.org structured data (roadmap §7).
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Safe: our own structured data, serialized from typed objects.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

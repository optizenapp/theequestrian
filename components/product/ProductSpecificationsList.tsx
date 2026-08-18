interface ProductSpecificationsListProps {
  items: string[];
}

export function ProductSpecificationsList({ items }: ProductSpecificationsListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="list-none m-0 space-y-3 p-0">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

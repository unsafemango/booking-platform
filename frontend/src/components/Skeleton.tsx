/** Grey placeholder shapes shown while a list loads. Hidden from screen readers; the label is announced instead. */

function Bar({ width, height = '0.9em' }: { width: string; height?: string }) {
  return <span className="skeleton" style={{ width, height }} />;
}

function Loading({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <Loading label="Loading products…" />
      <div className="grid" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="card product">
            <span className="skeleton skeleton-image" />
            <div className="product-body skeleton-lines">
              <Bar width="30%" height="0.7em" />
              <Bar width="70%" height="1.2em" />
              <Bar width="95%" />
              <Bar width="80%" />
              <div className="product-foot">
                <Bar width="25%" height="1.2em" />
                <Bar width="35%" height="2.2em" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      <Loading label="Loading bookings…" />
      <div className="stack" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="card order skeleton-lines">
            <div className="order-head">
              <Bar width="40%" />
              <Bar width="80px" height="1.4em" />
            </div>
            <Bar width="60%" />
            <div className="order-foot">
              <Bar width="20%" height="1.2em" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

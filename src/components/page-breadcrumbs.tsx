import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbJsonLd, type BreadcrumbEntry } from "@/lib/seo";

/**
 * Breadcrumb visibile (piccolo, non invasivo) + BreadcrumbList in JSON-LD.
 * `items` non include la Home, aggiunta automaticamente come primo livello.
 */
export function PageBreadcrumbs({ items, className }: { items: BreadcrumbEntry[]; className?: string }) {
  const full = [{ name: "Home", path: "/" }, ...items];

  return (
    <>
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {full.map((item, i) => (
            <Fragment key={item.path}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === full.length - 1 ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.path}>{item.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <JsonLd data={buildBreadcrumbJsonLd(full)} />
    </>
  );
}

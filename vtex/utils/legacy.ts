import type { Seo } from "../../commerce/types.ts";
import { capitalize } from "../../utils/capitalize.ts";
import { STALE } from "../../utils/fetch.ts";
import { AppContext } from "../mod.ts";
import { slugify } from "../utils/slugify.ts";
import type { PageType, Segment } from "../utils/types.ts";

export const toSegmentParams = (
  segment: Partial<Segment>,
) => (Object.fromEntries(
  Object.entries({
    utmi_campaign: segment.utmi_campaign ?? undefined,
    utm_campaign: segment.utm_campaign ?? undefined,
    utm_source: segment.utm_source ?? undefined,
  }).filter(([_, v]) => v != undefined),
));

const PAGE_TYPE_TO_MAP_PARAM = {
  Brand: "b",
  Category: "c",
  Department: "c",
  SubCategory: "c",
  Collection: "productClusterIds",
  Cluster: "productClusterIds",
  Search: "ft",
  FullText: "ft",
  Product: "p",
  NotFound: null,
};

const segmentsFromTerm = (term: string) => term.split("/").filter(Boolean);

export const pageTypesFromPathname = async (
  term: string,
  ctx: AppContext,
) => {
  const segments = segmentsFromTerm(term);
  const { vcsDeprecated } = ctx;

  const results = await Promise.all(
    segments.map((_, index) =>
      vcsDeprecated["GET /api/catalog_system/pub/portal/pagetype/:term"]({
        term: segments.slice(0, index + 1).join("/"),
      }, STALE).then((res) => res.json())
    ),
  );

  return results.filter((result) => PAGE_TYPE_TO_MAP_PARAM[result.pageType]);
};

export const getMapAndTerm = (
  pageTypes: PageType[],
) => {
  const term = pageTypes
    .map((type, index) =>
      type.url
        ? segmentsFromTerm(
          new URL(`http://${type.url}`).pathname,
        )[index]
        : null
    )
    .filter(Boolean)
    .join("/");

  const map = pageTypes
    .map((type) => PAGE_TYPE_TO_MAP_PARAM[type.pageType])
    .filter(Boolean)
    .join(",");

  // We are in a search page
  if (map === "ft" && term === "s") {
    return ["", ""];
  }

  return [map, term];
};

export const pageTypesToBreadcrumbList = (
  pages: PageType[],
  baseUrl: string,
) => {
  const filteredPages = pages
    .filter(({ pageType }) =>
      pageType === "Category" || pageType === "Department" ||
      pageType === "SubCategory"
    );

  return filteredPages.map((page, index) => {
    const position = index + 1;
    const slug = filteredPages.slice(0, position).map((x) => slugify(x.name!));

    return ({
      "@type": "ListItem" as const,
      name: page.name!,
      item: new URL(`/${slug.join("/")}`, baseUrl).href,
      position,
    });
  });
};

export const pageTypesToSeo = (
  pages: PageType[],
  req: Request,
  currentPage?: number,
): Seo | null => {
  const current = pages.at(-1);

  const url = new URL(req.url);
  const fullTextSearch = url.searchParams.get("q");

  if (!current && fullTextSearch) {
    return {
      title: capitalize(fullTextSearch),
      description: capitalize(fullTextSearch),
      canonical: req.url,
    };
  }

  if (!current) {
    return null;
  }

  return {
    title: current.title!,
    description: current.metaTagDescription!,
    canonical: toCanonical(
      new URL(
        current.url
          ? current.url.replace(/.+\.vtexcommercestable\.com\.br/, "")
          : url,
        url,
      ),
      currentPage,
    ),
  };
};

// Warning! this modifies the parameter. Use it consciously
function toCanonical(url: URL, page?: number) {
  if (typeof page === "number") {
    url.searchParams.set("page", `${page}`);
  }

  return url.href;
}

declare module "next" {
  const next: any;
  export default next;
  export type NextConfig = Record<string, any>;
  export type Metadata = Record<string, any>;
}

declare module "next/server" {
  export class NextRequest extends Request {
    constructor(input: RequestInfo, init?: RequestInit);
    nextUrl: URL;
    cookies: any;
    geo: any;
    ip: any;
  }
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static rewrite(destination: string | URL, init?: ResponseInit): NextResponse;
    cookies: any;
  }
}

declare module "next/link" {
  import type { ComponentType, ReactNode } from "react";
  interface LinkProps {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    children?: ReactNode;
  }
  const Link: ComponentType<LinkProps & Record<string, any>>;
  export default Link;
}

declare module "next/navigation" {
  export function useRouter(): {
    push: (url: string, options?: any) => void;
    replace: (url: string, options?: any) => void;
    refresh: () => void;
    back: () => void;
    prefetch: (url: string) => Promise<void>;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useSelectedLayoutSegment(): string | null;
  export function useSelectedLayoutSegments(): string[];
}

declare module "next/image" {
  import type { ComponentType } from "react";
  const Image: ComponentType<Record<string, any>>;
  export default Image;
}


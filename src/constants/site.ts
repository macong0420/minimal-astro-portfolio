export type NavigationItem = {
    name: string;
    path: string;
};

export const SITE = {
    name: "Mr.C",
    title: "客户端开发工程师 & 技术爱好者",
    description: "个人网站和博客",
    url: "https://blog.yc0501.online",
    defaultImage: "/default-og-image.jpg",
} as const;

export const NAVIGATION: {
    main: NavigationItem[];
} = {
    main: [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: "About", path: "/about" }
    ],
} as const;

export const CONTENT = {
    postsPerPage: 10,
    recentPostsLimit: 3,
    featuredProjectsLimit: 3,
} as const;

export const META = {
    openGraph: {
        type: "website",
        locale: "en_US",
    },
    twitter: {
        cardType: "summary_large_image",
    }
} as const; 
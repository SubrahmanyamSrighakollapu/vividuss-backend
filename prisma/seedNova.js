const { PrismaClient } = require("@prisma/client");

async function seedNovaStudio(prisma) {
  const existingNova = await prisma.template.findFirst({
    where: { name: "NOVA STUDIO" }
  });

  if (existingNova) {
    console.log("Template NOVA STUDIO already exists, skipping...");
    return;
  }

  const template = await prisma.template.create({
    data: {
      name: "NOVA STUDIO",
      description: "A premium modern creative agency and digital studio template with an editorial aesthetic.",
      category: "Agency",
      thumbnail: "/templates/nova-studio.png",
      theme: {
        colors: {
          primary: "#0f172a", // Slate 900
          secondary: "#334155", // Slate 700
          accent: "#3b82f6", // Blue 500
          background: "#fafafa", // Neutral 50
          surface: "#ffffff",
          text: "#0f172a",
          mutedText: "#64748b",
          border: "#e2e8f0"
        }
      },
      pages: {
        create: [
          // ========================
          // 1. HOME PAGE
          // ========================
          {
            name: "Home",
            slug: "home",
            order: 1,
            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: {
                    logo: "NOVA STUDIO",
                    navigation: [
                      { label: "Home", link: "/" },
                      { label: "About", link: "/about" },
                      { label: "Services", link: "/services" },
                      { label: "Work", link: "/work" },
                      { label: "Contact", link: "/contact" }
                    ],
                    buttonText: "Let's Talk",
                    buttonLink: "/contact"
                  },
                  config: {
                    backgroundColor: "theme.surface",
                    sticky: true
                  }
                },
                {
                  type: "hero",
                  order: 2,
                  content: {
                    eyebrow: "Global Creative Engineering",
                    heading: "We build digital platforms that define the modern era.",
                    description: "Nova Studio is an independent digital innovation agency. We partner with visionary leaders to craft exceptional platforms, products, and brands.",
                    primaryButtonText: "Explore Our Work",
                    primaryButtonLink: "/work",
                    secondaryButtonText: "Our Services",
                    secondaryButtonLink: "/services"
                  },
                  config: {
                    alignment: "left",
                    backgroundColor: "theme.background",
                    textColor: "theme.text",
                    paddingTop: "pt-40",
                    paddingBottom: "pb-32"
                  }
                },
                {
                  type: "logocloud",
                  order: 3,
                  content: {
                    heading: "PARTNERING WITH INDUSTRY LEADERS",
                    logos: [
                      { name: "Vanguard", imageUrl: "https://tailwindui.com/plus/img/logos/158x48/transistor-logo-gray-900.svg" },
                      { name: "Oasis", imageUrl: "https://tailwindui.com/plus/img/logos/158x48/reform-logo-gray-900.svg" },
                      { name: "Lumina", imageUrl: "https://tailwindui.com/plus/img/logos/158x48/tuple-logo-gray-900.svg" },
                      { name: "Synergy", imageUrl: "https://tailwindui.com/plus/img/logos/158x48/savvycal-logo-gray-900.svg" },
                      { name: "Apex", imageUrl: "https://tailwindui.com/plus/img/logos/158x48/statamic-logo-gray-900.svg" }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.surface"
                  }
                },
                {
                  type: "about",
                  order: 4,
                  content: {
                    eyebrow: "Our Philosophy",
                    heading: "Digital craftsmanship meets strategic rigor.",
                    description: "At Nova Studio, we believe that the best digital experiences are rooted in deep understanding and executed with uncompromising quality. We bridge the gap between design and technology.",
                    highlightText: "We don't just build websites. We build businesses.",
                    metadata: [
                      { label: "Founded 2015" },
                      { label: "40+ Experts" },
                      { label: "Global Reach" }
                    ],
                    pillars: [
                      {
                        number: "01",
                        title: "Strategic Foundation",
                        description: "Every decision is backed by data, research, and a clear understanding of your business objectives."
                      },
                      {
                        number: "02",
                        title: "Design Excellence",
                        description: "We obsess over typography, spacing, and interaction to create interfaces that feel effortless."
                      },
                      {
                        number: "03",
                        title: "Technical Mastery",
                        description: "Our engineering team builds scalable, accessible, and high-performance architectures."
                      }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.background"
                  }
                },
                {
                  type: "services",
                  order: 5,
                  content: {
                    heading: "Capabilities tailored for the digital age.",
                    services: [
                      {
                        title: "Brand Strategy",
                        description: "Positioning, messaging, and visual identity systems that resonate with modern audiences.",
                        link: "/services"
                      },
                      {
                        title: "Product Design",
                        description: "Intuitive user experiences and beautiful interfaces for complex digital products.",
                        link: "/services"
                      },
                      {
                        title: "Web Engineering",
                        description: "High-performance web applications built on modern stacks for speed and scale.",
                        link: "/services"
                      },
                      {
                        title: "Content Production",
                        description: "Editorial photography, 3D motion, and engaging copywriting that tells your story.",
                        link: "/services"
                      }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.surface"
                  }
                },
                {
                  type: "portfolio",
                  order: 6,
                  content: {
                    eyebrow: "Selected Work",
                    heading: "Transformative digital experiences.",
                    projects: [
                      {
                        title: "Aura Financial",
                        category: "Fintech Platform Design",
                        link: "/work"
                      },
                      {
                        title: "Koda Health",
                        category: "Healthcare Mobile App",
                        link: "/work"
                      },
                      {
                        title: "Loomis Commerce",
                        category: "E-Commerce Experience",
                        link: "/work"
                      },
                      {
                        title: "Vertex Mobility",
                        category: "EV Dashboard Interface",
                        link: "/work"
                      }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.background"
                  }
                },
                {
                  type: "stats",
                  order: 7,
                  content: {
                    stats: [
                      { value: "$2B+", label: "Client Revenue Generated" },
                      { value: "150+", label: "Digital Products Launched" },
                      { value: "35", label: "Industry Awards" },
                      { value: "99%", label: "Client Retention Rate" }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.primary",
                    textColor: "#ffffff"
                  }
                },
                {
                  type: "testimonials",
                  order: 8,
                  content: {
                    heading: "Voices of our partners",
                    testimonials: [
                      {
                        name: "Jonathan Reeves",
                        role: "CEO",
                        company: "Aura Financial",
                        quote: "Nova Studio completely transformed our digital presence. Their ability to distill complex financial concepts into a seamless user experience was extraordinary.",
                        rating: 5,
                        avatarUrl: "https://i.pravatar.cc/150?u=jonathan"
                      },
                      {
                        name: "Samantha Vance",
                        role: "VP of Product",
                        company: "Vertex Mobility",
                        quote: "The technical rigor and design precision the Nova team brought to our dashboard was unparalleled. They are true partners.",
                        rating: 5,
                        avatarUrl: "https://i.pravatar.cc/150?u=samantha"
                      }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.surface"
                  }
                },
                {
                  type: "process",
                  order: 9,
                  content: {
                    eyebrow: "How We Work",
                    heading: "A proven methodology for success.",
                    steps: [
                      { title: "Immersion", description: "Deep diving into your industry, audience, and challenges to form a strategic baseline." },
                      { title: "Architecture", description: "Mapping out user flows, wireframes, and technical infrastructure for the platform." },
                      { title: "Execution", description: "Bringing the vision to life through pixel-perfect design and robust engineering." },
                      { title: "Evolution", description: "Continuous iteration, optimization, and scaling post-launch based on real-world data." }
                    ]
                  },
                  config: {
                    backgroundColor: "theme.background"
                  }
                },
                {
                  type: "cta",
                  order: 10,
                  content: {
                    heading: "Have a project in mind?",
                    description: "We're currently taking on new projects for Q3. Reach out to discuss how we can partner together.",
                    buttonText: "Contact Us",
                    buttonLink: "/contact"
                  },
                  config: {
                    backgroundColor: "theme.secondary",
                    textColor: "#ffffff"
                  }
                },
                {
                  type: "footer",
                  order: 11,
                  content: {
                    logo: "NOVA STUDIO",
                    description: "A premium digital agency crafting the future of the web.",
                    columns: [
                      {
                        title: "Navigation",
                        links: [
                          { label: "Home", link: "/" },
                          { label: "About", link: "/about" },
                          { label: "Services", link: "/services" },
                          { label: "Work", link: "/work" }
                        ]
                      },
                      {
                        title: "Connect",
                        links: [
                          { label: "Twitter", link: "#" },
                          { label: "LinkedIn", link: "#" },
                          { label: "Instagram", link: "#" }
                        ]
                      }
                    ],
                    social: [],
                    copyright: "© 2026 Nova Studio. All rights reserved."
                  },
                  config: {
                    backgroundColor: "theme.surface"
                  }
                }
              ]
            }
          },

          // ========================
          // 2. ABOUT PAGE
          // ========================
          {
            name: "About",
            slug: "about",
            order: 2,
            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: {
                    logo: "NOVA STUDIO",
                    navigation: [
                      { label: "Home", link: "/" },
                      { label: "About", link: "/about" },
                      { label: "Services", link: "/services" },
                      { label: "Work", link: "/work" },
                      { label: "Contact", link: "/contact" }
                    ],
                    buttonText: "Let's Talk",
                    buttonLink: "/contact"
                  }
                },
                {
                  type: "hero",
                  order: 2,
                  content: {
                    eyebrow: "Our Story",
                    heading: "Driven by passion, guided by strategy.",
                    description: "Nova Studio was founded with a single premise: digital experiences should be beautiful, functional, and highly performant.",
                    primaryButtonText: "Join Our Team",
                    primaryButtonLink: "/contact"
                  },
                  config: { alignment: "center", paddingTop: "pt-32" }
                },
                {
                  type: "stats",
                  order: 3,
                  content: {
                    stats: [
                      { value: "40+", label: "Talented Creatives" },
                      { value: "6", label: "Global Offices" },
                      { value: "11", label: "Years in Business" }
                    ]
                  }
                },
                {
                  type: "process",
                  order: 4,
                  content: {
                    eyebrow: "Our Values",
                    heading: "What drives us forward.",
                    steps: [
                      { title: "Transparency", description: "Honest communication at every stage of the project." },
                      { title: "Excellence", description: "We do not compromise on the quality of our output." },
                      { title: "Collaboration", description: "We work with you, not just for you." }
                    ]
                  }
                },
                {
                  type: "cta",
                  order: 5,
                  content: {
                    heading: "Want to know more?",
                    description: "Read our manifesto or get in touch.",
                    buttonText: "Contact Us",
                    buttonLink: "/contact"
                  }
                },
                {
                  type: "footer",
                  order: 6,
                  content: {
                    logo: "NOVA STUDIO",
                    copyright: "© 2026 Nova Studio."
                  }
                }
              ]
            }
          },

          // ========================
          // 3. SERVICES PAGE
          // ========================
          {
            name: "Services",
            slug: "services",
            order: 3,
            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: { logo: "NOVA STUDIO" }
                },
                {
                  type: "hero",
                  order: 2,
                  content: {
                    eyebrow: "What We Do",
                    heading: "End-to-end digital solutions.",
                    description: "From initial brand strategy to complex engineering, we cover the full spectrum of digital creation.",
                    primaryButtonText: "Start a Project",
                    primaryButtonLink: "/contact"
                  }
                },
                {
                  type: "services",
                  order: 3,
                  content: {
                    heading: "Our Expertise",
                    services: [
                      { title: "Brand Strategy", description: "Positioning and identity." },
                      { title: "UX/UI Design", description: "User-centric interfaces." },
                      { title: "Web Development", description: "Next.js & React architectures." },
                      { title: "E-Commerce", description: "Shopify Plus & headless commerce." }
                    ]
                  }
                },
                {
                  type: "process",
                  order: 4,
                  content: {
                    eyebrow: "Delivery",
                    heading: "Our Service Methodology",
                    steps: [
                      { title: "Audit", description: "Evaluating current state." },
                      { title: "Blueprint", description: "Planning the architecture." },
                      { title: "Build", description: "Executing the deliverables." }
                    ]
                  }
                },
                {
                  type: "footer",
                  order: 5,
                  content: { logo: "NOVA STUDIO", copyright: "© 2026 Nova Studio." }
                }
              ]
            }
          },

          // ========================
          // 4. WORK PAGE
          // ========================
          {
            name: "Work",
            slug: "work",
            order: 4,
            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: { logo: "NOVA STUDIO" }
                },
                {
                  type: "hero",
                  order: 2,
                  content: {
                    eyebrow: "Our Portfolio",
                    heading: "Work that speaks for itself.",
                    description: "Explore our latest case studies and success stories.",
                    primaryButtonText: "View All",
                    primaryButtonLink: "#"
                  }
                },
                {
                  type: "portfolio",
                  order: 3,
                  content: {
                    eyebrow: "Case Studies",
                    heading: "Recent Projects",
                    projects: [
                      { title: "Aura Financial", category: "Fintech Platform", link: "/work" },
                      { title: "Koda Health", category: "Healthcare Mobile App", link: "/work" },
                      { title: "Loomis Commerce", category: "E-Commerce", link: "/work" },
                      { title: "Vertex Mobility", category: "EV Interface", link: "/work" }
                    ]
                  }
                },
                {
                  type: "testimonials",
                  order: 4,
                  content: {
                    heading: "Client Feedback",
                    testimonials: [
                      { name: "Client A", role: "CEO", company: "Aura", quote: "Exceptional work." }
                    ]
                  }
                },
                {
                  type: "footer",
                  order: 5,
                  content: { logo: "NOVA STUDIO", copyright: "© 2026 Nova Studio." }
                }
              ]
            }
          },

          // ========================
          // 5. CONTACT PAGE
          // ========================
          {
            name: "Contact",
            slug: "contact",
            order: 5,
            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: { logo: "NOVA STUDIO" }
                },
                {
                  type: "contact",
                  order: 2,
                  content: {
                    heading: "Let's work together.",
                    email: "hello@novastudio.agency",
                    phone: "+1 (555) 123-4567"
                  }
                },
                {
                  type: "footer",
                  order: 3,
                  content: { logo: "NOVA STUDIO", copyright: "© 2026 Nova Studio." }
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`Created template: ${template.name}`);
}

module.exports = seedNovaStudio;

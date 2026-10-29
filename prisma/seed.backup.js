const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.template.create({
    data: {
      name: "Modern Agency",
      description: "A clean and modern agency website template.",
      category: "Agency",
      thumbnail: "/templates/modern-agency.png",

      pages: {
        create: [
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
                    logo: "Modern Agency",
                    navigation: [
                      { label: "Home", link: "/" },
                      { label: "Services", link: "/services" },
                      { label: "About", link: "/about" },
                      { label: "Process", link: "/process" }
                    ],
                    buttonText: "Let's Talk",
                    buttonLink: "/contact"
                  },
                  config: {
                    backgroundColor: "transparent",
                    sticky: true
                  }
                },
                {
                  type: "hero",
                  order: 2,
                  content: {
                    eyebrow: "Digital Studio",
                    heading: "Digital experiences built for ambitious brands.",
                    description: "We design and build high-performance digital products that help ambitious companies turn ideas into meaningful growth.",
                    primaryButtonText: "Start a Project",
                    primaryButtonLink: "/contact",
                    secondaryButtonText: "View Our Work",
                    secondaryButtonLink: "/work"
                  },
                  config: {
                    alignment: "center",
                    backgroundColor: "#ffffff",
                    textColor: "#111827",
                    paddingTop: "pt-32",
                    paddingBottom: "pb-32"
                  }
                },
                {
                  type: "logocloud",
                  order: 3,
                  content: {
                    heading: "TRUSTED BY AMBITIOUS TEAMS AT",
                    logos: [
                      { name: "Acme Corp" },
                      { name: "Global" },
                      { name: "Nebula" },
                      { name: "Quantum" },
                      { name: "Horizon" }
                    ]
                  }
                },
                {
  type: "about",
  order: 4,
  content: {
    eyebrow: "Who We Are",

    heading:
      "We turn complex ideas into simple digital experiences.",

    description:
      "We are an independent digital agency that brings together strategic design and technical excellence. Our mission is to create distinctive products that people love to use.",

    highlightText:
      "Good design is good business. We help you achieve both.",

    metadata: [
      {
        label: "Independent Digital Agency",
      },
      {
        label: "Based in SF & Berlin",
      },
      {
        label: "Est. 2018",
      },
    ],

    pillars: [
      {
        number: "01",
        title: "Commercial Rigor",
        description:
          "Every design choice is anchored in business economics and conversion fundamentals.",
      },
      {
        number: "02",
        title: "Architectural Craft",
        description:
          "Obsessive typographic discipline, sub-second latency, and scalable frontend architectures.",
      },
      {
        number: "03",
        title: "Direct Access",
        description:
          "Work directly with senior leads — no account managers, bureaucracy, or translation loss.",
      },
    ],
  },
},
                {
                  type: "services",
                  order: 5,
                  content: {
                    heading: "Everything you need to build what comes next.",
                    services: [
                      {
                        title: "Strategy",
                        description: "We define the product direction, positioning and digital experience to ensure long-term success.",
                        link: "/services/strategy"
                      },
                      {
                        title: "Design",
                        description: "We create clear, distinctive interfaces built around your customers' needs and behaviors.",
                        link: "/services/design"
                      },
                      {
                        title: "Development",
                        description: "We build scalable, fast and reliable digital products using modern technology stacks.",
                        link: "/services/development"
                      }
                    ]
                  },
                  config: {
                    backgroundColor: "#f9fafb"
                  }
                },
                {
                  type: "portfolio",
                  order: 6,
                  content: {
                    eyebrow: "Featured Work",
                    heading: "Selected projects that show what we can do.",
                    projects: [
                      {
                        title: "Fintech Platform",
                        category: "Product Design · Development",
                        link: "/work/fintech"
                      },
                      {
                        title: "Brand & Digital",
                        category: "Strategy · Design",
                        link: "/work/brand"
                      }
                    ]
                  }
                },
                {
                  type: "stats",
                  order: 7,
                  content: {
                    stats: [
                      { value: "12+", label: "Years of experience" },
                      { value: "80+", label: "Projects delivered" },
                      { value: "24", label: "Countries reached" },
                      { value: "98%", label: "Client satisfaction" }
                    ]
                  },
                  config: {
                    backgroundColor: "#111827",
                    textColor: "#ffffff"
                  }
                },
                {
                  type: "process",
                  order: 8,
                  content: {
                    eyebrow: "Our Approach",
                    heading: "How we work together",
                    steps: [
                      { title: "Discover", description: "Understanding your business goals and user needs." },
                      { title: "Define", description: "Mapping out the strategy and technical requirements." },
                      { title: "Design", description: "Creating the visual identity and user interface." },
                      { title: "Build", description: "Developing the product with clean, scalable code." },
                      { title: "Launch", description: "Testing, deployment, and ongoing support." }
                    ]
                  }
                },
                {
                  type: "testimonials",
                  order: 9,
                  content: {
                    heading: "What our partners say",
                    testimonials: [
                      {
                        name: "Sarah Jenkins",
                        role: "Product Manager",
                        company: "TechFlow",
                        quote: "The team delivered an exceptional product that exceeded our expectations. Their attention to detail is unmatched.",
                        rating: 5
                      },
                      {
                        name: "Marcus Chen",
                        role: "Founder",
                        company: "Elevate",
                        quote: "Working with them was the best decision we made. They truly understand modern digital experiences.",
                        rating: 5
                      },
                      {
                        name: "Elena Rodriguez",
                        role: "Marketing Director",
                        company: "Lumina",
                        quote: "They brought our vision to life faster and better than we thought possible. Highly recommended.",
                        rating: 5
                      }
                    ]
                  }
                },
                {
                  type: "cta",
                  order: 10,
                  content: {
                    heading: "Let's build something remarkable together.",
                    description: "Ready to start your next project? Get in touch and let's discuss how we can help.",
                    buttonText: "Start a conversation",
                    buttonLink: "/contact"
                  },
                  config: {
                    backgroundColor: "#000000",
                    textColor: "#ffffff"
                  }
                },
                {
                  type: "footer",
                  order: 11,
                  content: {
                    logo: "Modern Agency",
                    description: "We create digital experiences for ambitious brands.",
                    columns: [
                      {
                        title: "Company",
                        links: [
                          { label: "About", link: "/about" },
                          { label: "Work", link: "/work" },
                          { label: "Services", link: "/services" },
                          { label: "Contact", link: "/contact" }
                        ]
                      },
                      {
                        title: "Services",
                        links: [
                          { label: "Strategy", link: "/services/strategy" },
                          { label: "Design", link: "/services/design" },
                          { label: "Development", link: "/services/development" }
                        ]
                      }
                    ],
                    social: [
                      { platform: "LinkedIn", link: "#" },
                      { platform: "Twitter", link: "#" },
                      { platform: "Dribbble", link: "#" }
                    ],
                    copyright: "© 2026 Modern Agency. All rights reserved."
                  },
                  config: {
                    backgroundColor: "#ffffff",
                    textColor: "#111827"
                  }
                }
              ]
            }
          },

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
                    logo: "Modern Agency"
                  }
                },
                {
                  type: "about",
                  order: 2,
                  content: {
                    heading: "About Our Agency",
                    description:
                      "We help businesses build strong digital experiences."
                  }
                },
                {
                  type: "footer",
                  order: 3,
                  content: {
                    copyright: "© 2026 Modern Agency"
                  }
                }
              ]
            }
          },

          {
            name: "Services",
            slug: "services",
            order: 3,

            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: {
                    logo: "Modern Agency"
                  }
                },
                {
                  type: "services",
                  order: 2,
                  content: {
                    heading: "Our Services",
                    services: [
                      {
                        title: "Web Development",
                        description: "Modern web applications."
                      },
                      {
                        title: "Design",
                        description: "Beautiful user interfaces."
                      }
                    ]
                  }
                },
                {
                  type: "footer",
                  order: 3,
                  content: {
                    copyright: "© 2026 Modern Agency"
                  }
                }
              ]
            }
          },

          {
            name: "Contact",
            slug: "contact",
            order: 4,

            sections: {
              create: [
                {
                  type: "header",
                  order: 1,
                  content: {
                    logo: "Modern Agency"
                  }
                },
                {
                  type: "contact",
                  order: 2,
                  content: {
                    heading: "Get In Touch",
                    email: "hello@example.com",
                    phone: "+91 9876543210"
                  }
                },
                {
                  type: "footer",
                  order: 3,
                  content: {
                    copyright: "© 2026 Modern Agency"
                  }
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
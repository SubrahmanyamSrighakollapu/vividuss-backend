const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Find the existing Modern Agency template
  const template = await prisma.template.findFirst({
    where: {
      name: "Modern Agency",
    },
    include: {
      pages: {
        where: {
          slug: "home",
        },
        include: {
          sections: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error("Modern Agency template not found");
  }

  const homePage = template.pages[0];

  if (!homePage) {
    throw new Error("Home page not found");
  }

  // Find the Services section on Home
  const servicesSection = homePage.sections.find(
    (section) => section.type === "services"
  );

  if (!servicesSection) {
    throw new Error("Services section not found on Home page");
  }

  // Preserve the existing section content,
  // then add the complete editable Services structure.
  const updatedContent = {
    ...servicesSection.content,

    eyebrow: "Core Capabilities",

    heading:
      "Everything you need to build what comes next.",

    serviceLabel: "Service Domain",

    deliverablesLabel: "Key Deliverables",

    buttonText: "Explore Capability",

    services: [
      {
        title: "Strategy & Architecture",

        description:
          "We define product vision, technical roadmaps, and competitive positioning to ensure defensible market advantage.",

        deliverables: [
          "Market Positioning",
          "Technical Feasibility",
          "Product Roadmaps",
          "Information Architecture",
        ],

        link: "#contact",
      },

      {
        title: "Interface & Brand Systems",

        description:
          "Distinctive digital interfaces, comprehensive component libraries, and motion design tailored to modern web standards.",

        deliverables: [
          "Design Systems",
          "High-Fidelity UI/UX",
          "Motion & Interaction",
          "Interactive Prototyping",
        ],

        link: "#contact",
      },

      {
        title: "Full-Stack Web Engineering",

        description:
          "Scalable, high-velocity digital products built with modern cloud architectures, sub-second latency, and clean codebases.",

        deliverables: [
          "Next.js & React",
          "Distributed APIs",
          "Performance Engineering",
          "Headless CMS Platforms",
        ],

        link: "#contact",
      },
    ],
  };

  const updatedSection = await prisma.templateSection.update({
    where: {
      id: servicesSection.id,
    },

    data: {
      content: updatedContent,
    },
  });

  console.log("Services template section updated successfully.");

  console.log({
    template: template.name,
    page: homePage.name,
    section: updatedSection.type,
    sectionId: updatedSection.id,
  });
}

main()
  .catch((error) => {
    console.error("Update failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
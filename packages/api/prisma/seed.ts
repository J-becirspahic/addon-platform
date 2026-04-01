import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@addon-platform.dev' },
    update: {},
    create: {
      email: 'admin@addon-platform.dev',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      isAdmin: true,
    },
  });
  console.log(`  Admin user: ${admin.email} (id: ${admin.id})`);

  // Create regular dev user
  const devPasswordHash = await bcrypt.hash('Dev123!', 10);
  const dev = await prisma.user.upsert({
    where: { email: 'dev@addon-platform.dev' },
    update: {},
    create: {
      email: 'dev@addon-platform.dev',
      name: 'Dev User',
      passwordHash: devPasswordHash,
      isAdmin: false,
    },
  });
  console.log(`  Dev user: ${dev.email} (id: ${dev.id})`);

  // Create organizations
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme',
      description: 'Acme Corporation - makers of fine addons',
    },
  });
  console.log(`  Org: ${acme.name} (slug: ${acme.slug})`);

  const testStudio = await prisma.organization.upsert({
    where: { slug: 'test-studio' },
    update: {},
    create: {
      name: 'Test Studio',
      slug: 'test-studio',
      description: 'A test studio for addon development',
    },
  });
  console.log(`  Org: ${testStudio.name} (slug: ${testStudio.slug})`);

  // Add members (upsert via unique constraint)
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: acme.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      userId: admin.id,
      role: 'OWNER',
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: acme.id,
        userId: dev.id,
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      userId: dev.id,
      role: 'MEMBER',
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: testStudio.id,
        userId: dev.id,
      },
    },
    update: {},
    create: {
      organizationId: testStudio.id,
      userId: dev.id,
      role: 'OWNER',
    },
  });

  // Create addons
  const widgetAddon = await prisma.addon.upsert({
    where: {
      organizationId_slug: {
        organizationId: acme.id,
        slug: 'weather-widget',
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      name: 'Weather Widget',
      slug: 'weather-widget',
      description: 'A widget that displays current weather information',
      type: 'WIDGET',
      status: 'ACTIVE',
    },
  });
  console.log(`  Addon: ${widgetAddon.name}`);

  const connectorAddon = await prisma.addon.upsert({
    where: {
      organizationId_slug: {
        organizationId: acme.id,
        slug: 'slack-connector',
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      name: 'Slack Connector',
      slug: 'slack-connector',
      description: 'Integrates with Slack for notifications and commands',
      type: 'CONNECTOR',
      status: 'DRAFT',
    },
  });
  console.log(`  Addon: ${connectorAddon.name}`);

  const themeAddon = await prisma.addon.upsert({
    where: {
      organizationId_slug: {
        organizationId: testStudio.id,
        slug: 'dark-theme',
      },
    },
    update: {},
    create: {
      organizationId: testStudio.id,
      name: 'Dark Theme',
      slug: 'dark-theme',
      description: 'A sleek dark theme for the platform',
      type: 'THEME',
      status: 'ACTIVE',
    },
  });
  console.log(`  Addon: ${themeAddon.name}`);

  // Create versions
  await prisma.addonVersion.upsert({
    where: {
      addonId_version: {
        addonId: widgetAddon.id,
        version: '1.0.0',
      },
    },
    update: {},
    create: {
      addonId: widgetAddon.id,
      version: '1.0.0',
      changelog: 'Initial release of the Weather Widget',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-01-15'),
    },
  });

  await prisma.addonVersion.upsert({
    where: {
      addonId_version: {
        addonId: widgetAddon.id,
        version: '1.1.0',
      },
    },
    update: {},
    create: {
      addonId: widgetAddon.id,
      version: '1.1.0',
      changelog: 'Added 5-day forecast support',
      status: 'DRAFT',
    },
  });

  await prisma.addonVersion.upsert({
    where: {
      addonId_version: {
        addonId: connectorAddon.id,
        version: '0.1.0',
      },
    },
    update: {},
    create: {
      addonId: connectorAddon.id,
      version: '0.1.0',
      changelog: 'Initial beta of Slack integration',
      status: 'FAILED',
      buildReport: {
        error: 'Build timed out after 300 seconds',
        step: 'compilation',
      },
    },
  });

  await prisma.addonVersion.upsert({
    where: {
      addonId_version: {
        addonId: themeAddon.id,
        version: '2.0.0',
      },
    },
    update: {},
    create: {
      addonId: themeAddon.id,
      version: '2.0.0',
      changelog: 'Complete redesign with improved contrast ratios',
      status: 'PUBLISHED',
      publishedAt: new Date('2025-03-01'),
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

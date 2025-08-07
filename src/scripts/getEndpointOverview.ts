import 'dotenv/config';
import axios from 'axios';
import cheerio from 'cheerio';
import { OptaCredentials } from '../types/index.js';

interface EndpointOverview {
  name: string;
  code: string;
  url: string;
  overview: string;
  sections: string[];
}

async function getEndpointOverview(): Promise<void> {
  // Verificar credenciales
  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('Error: OPTA_USERNAME and OPTA_PASSWORD must be configured');
    process.exit(1);
  }

  const baseUrl = 'https://docs.performgroup.com';
  const endpointUrl = '/docs/rh/sdapi/Topics/soccer/opta-sdapiamp-soccer-api-possession-events.htm';
  const fullUrl = `${baseUrl}${endpointUrl}`;

  console.log(`🔍 Obteniendo overview del endpoint MA13 (Possession Events)...`);
  console.log(`📄 URL: ${fullUrl}\n`);

  try {
            // Make request with authentication
    const response = await axios.get(fullUrl, {
      auth: {
        username: credentials.username,
        password: credentials.password,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    if (response.status === 200) {
      console.log(`✅ Successful request (Status: ${response.status})`);
      
      // Parsear el HTML
      const $ = cheerio.load(response.data);
      
              // Extract title
      const title = $('title').text().trim() || 'Possession Events (MA13)';
      
      // Buscar secciones de overview
      const overview: EndpointOverview = {
        name: 'Possession Events (MA13)',
        code: 'MA13',
        url: endpointUrl,
        overview: '',
        sections: []
      };

      // Buscar contenido de overview en diferentes elementos
      const possibleOverviewSelectors = [
        '.overview',
        '.summary',
        '.description',
        '.intro',
        'p:first-of-type',
        '.content p',
        '.main-content p',
        'div[class*="overview"]',
        'div[class*="summary"]',
        'div[class*="description"]'
      ];

      for (const selector of possibleOverviewSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim();
          if (text.length > 50) { // Solo si tiene contenido significativo
            overview.overview = text;
            console.log(`📝 Overview encontrado con selector: ${selector}`);
            break;
          }
        }
      }

              // If no specific overview found, take the first significant paragraph
      if (!overview.overview) {
        const paragraphs = $('p');
        for (let i = 0; i < paragraphs.length; i++) {
          const text = $(paragraphs[i]).text().trim();
          if (text.length > 100 && !text.includes('©') && !text.includes('Copyright')) {
            overview.overview = text;
            console.log(`📝 Overview extracted from paragraph ${i + 1}`);
            break;
          }
        }
      }

      // Extraer secciones principales
      const headings = $('h1, h2, h3, h4');
      headings.each((index, element) => {
        const headingText = $(element).text().trim();
        if (headingText && headingText.length > 3) {
          overview.sections.push(headingText);
        }
      });

      // Mostrar resultados
      console.log(`\n📋 **RESULTADOS DEL ENDPOINT MA13**`);
      console.log(`=====================================`);
      console.log(`🎯 **Nombre:** ${overview.name}`);
              console.log(`🔢 **Code:** ${overview.code}`);
      console.log(`🔗 **URL:** ${overview.url}`);
      
      if (overview.overview) {
        console.log(`\n📖 **OVERVIEW:**`);
        console.log(`---------------`);
        console.log(overview.overview);
      } else {
        console.log(`\n❌ **OVERVIEW:** No se pudo extraer el overview`);
      }

      if (overview.sections.length > 0) {
        console.log(`\n📑 **SECCIONES ENCONTRADAS:**`);
        console.log(`---------------------------`);
        overview.sections.slice(0, 10).forEach((section, index) => {
          console.log(`${index + 1}. ${section}`);
        });
        if (overview.sections.length > 10) {
          console.log(`... and ${overview.sections.length - 10} more sections`);
        }
      }

      // Guardar en archivo
      const fs = await import('fs');
      const outputFile = 'ma13-overview.json';
      fs.writeFileSync(outputFile, JSON.stringify(overview, null, 2));
      console.log(`\n💾 Resultados guardados en: ${outputFile}`);

    } else {
      console.error(`❌ Error: Status ${response.status}`);
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`❌ Error HTTP: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 401) {
          console.error('🔐 Authentication error. Verify credentials.');
        } else if (error.response.status === 404) {
          console.error('🔍 Endpoint no encontrado. Verifica la URL.');
        }
      } else if (error.request) {
        console.error('❌ Error de red: No se pudo conectar al servidor');
      } else {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.error('❌ Error inesperado:', error);
    }
  }
}

// Ejecutar el script
getEndpointOverview().catch(console.error); 
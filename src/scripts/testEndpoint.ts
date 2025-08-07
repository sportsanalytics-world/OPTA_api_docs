import 'dotenv/config';
import axios from 'axios';
import { OptaCredentials } from '../types/index.js';

async function testEndpoint() {
  console.log('🧪 Testing specific OPTA endpoint...\n');

  const credentials: OptaCredentials = {
    username: process.env.OPTA_USERNAME || '',
    password: process.env.OPTA_PASSWORD || '',
  };

  if (!credentials.username || !credentials.password) {
    console.error('❌ Error: OPTA_USERNAME y OPTA_PASSWORD deben estar configurados en .env');
    process.exit(1);
  }

  const baseUrl = 'https://docs.performgroup.com';
  const endpointUrl = '/Topics/soccer/opta-sdapiamp-soccer-api-possession-events.htm';
  const fullUrl = `${baseUrl}${endpointUrl}`;

  console.log(`🔗 Probando URL: ${fullUrl}\n`);

  try {
    const response = await axios.get(fullUrl, {
      auth: {
        username: credentials.username,
        password: credentials.password
      },
      timeout: 10000
    });

    console.log(`✅ Success! Status: ${response.status}`);
    console.log(`📄 Content size: ${response.data.length} characters`);
    console.log(`📋 Headers:`, response.headers['content-type']);
    
    // Mostrar las primeras 500 caracteres del contenido
    const preview = response.data.substring(0, 500);
    console.log(`\n📖 Vista previa del contenido:`);
    console.log(preview + '...');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Error desconocido');
    
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      console.log(`📊 Status: ${axiosError.response?.status}`);
      console.log(`📋 Headers:`, axiosError.response?.headers);
    }
  }
}

testEndpoint().catch(console.error); 
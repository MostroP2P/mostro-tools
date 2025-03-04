import { Mostro } from '@mostrop2p/mostro-tools';

async function basicConnectionExample() {
  console.log('Iniciando ejemplo de conexión básica...');

  const mostro = new Mostro({
    mostroPubKey: 'npub1w4pzjxwz99g0wnpj6hw0kgj42s89xngh78qk0t88q74w5k6effdqv56zvs', // Ejemplo de clave pública
    relays: ['wss://relay.damus.io', 'wss://relay.nostr.info', 'wss://nos.lol'],
    debug: true,
  });

  try {
    console.log('Conectando a relays...');
    await mostro.connect();
    console.log('Conexión exitosa!');

    console.log(`Conectado a ${mostro.getNostr().getRelayCount()} relays`);

    const infoPromise = new Promise<void>((resolve) => {
      mostro.once('info-update', (info) => {
        console.log('Información del nodo Mostro:');
        console.log('- Versión:', info.mostro_version);
        console.log('- Monto mínimo:', info.min_order_amount, 'sats');
        console.log('- Monto máximo:', info.max_order_amount, 'sats');
        console.log('- Comisión:', info.fee * 100, '%');
        resolve();
      });
    });

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout esperando información')), 10000);
    });

    await Promise.race([infoPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error durante la conexión:', error);
  }
}

basicConnectionExample().catch(console.error);

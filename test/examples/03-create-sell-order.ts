import { Mostro, KeyManager, OrderType, OrderStatus } from '@mostrop2p/mostro-tools';
import { generateMnemonic } from 'bip39';

async function createSellOrderExample() {
  console.log('Iniciando ejemplo de creación de orden de venta...');

  // Generar o usar una frase mnemónica existente
  const mnemonic = process.env.MNEMONIC || generateMnemonic();
  console.log('Usando mnemónico (guárdalo de forma segura):', mnemonic);

  // Inicializar manejador de claves
  const keyManager = new KeyManager();
  await keyManager.initialize(mnemonic);
  console.log('KeyManager inicializado');

  // Inicializar cliente Mostro
  const mostro = new Mostro({
    mostroPubKey: 'npub1w4pzjxwz99g0wnpj6hw0kgj42s89xngh78qk0t88q74w5k6effdqv56zvs',
    relays: ['wss://relay.damus.io', 'wss://relay.nostr.info'],
    privateKey: keyManager.getIdentityKey()!,
    debug: true,
  });

  try {
    // Conectar a Mostro
    await mostro.connect();
    console.log('Conectado a Mostro');

    // Crear una nueva orden de venta a precio de mercado
    console.log('Creando nueva orden de venta...');
    const orderResponse = await mostro.submitOrder({
      kind: OrderType.SELL,
      status: OrderStatus.PENDING,
      amount: 0, // 0 significa precio de mercado
      fiat_code: 'USD',
      fiat_amount: 50, // $50 USD
      payment_method: 'BANK',
      premium: 2, // 2% de premio
    });

    console.log('Orden creada exitosamente!');
    console.log('Respuesta:', orderResponse);

    const orderId = orderResponse.order?.id;
    if (orderId) {
      console.log(`\nOrden creada con ID: ${orderId}`);
      console.log('Esperando actualización del estado...');

      // Esperar a que la orden aparezca en el listado
      const waitForOrder = () => new Promise<void>((resolve) => {
        mostro.on('order-update', (order) => {
          if (order.id === orderId) {
            console.log('Orden publicada en la red!');
            console.log('Detalles de la orden:');
            console.log(order);
            resolve();
          }
        });
      });

      // Establecer timeout de 30 segundos
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout esperando confirmación')), 30000);
      });

      await Promise.race([waitForOrder(), timeoutPromise]);
    }

  } catch (error) {
    console.error('Error durante la creación de la orden:', error);
  }
}

// Ejecutar el ejemplo
createSellOrderExample().catch(console.error);

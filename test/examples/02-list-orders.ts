import { Mostro, Order, OrderType, OrderStatus } from '@mostrop2p/mostro-tools';

async function listOrdersExample() {
  console.log('Iniciando ejemplo de listado de órdenes...');

  const mostro = new Mostro({
    mostroPubKey: 'npub1w4pzjxwz99g0wnpj6hw0kgj42s89xngh78qk0t88q74w5k6effdqv56zvs',
    relays: ['wss://relay.damus.io', 'wss://relay.nostr.info'],
  });

  try {
    await mostro.connect();
    console.log('Conectado a Mostro');

    console.log('Obteniendo órdenes activas, por favor espere...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const orders = await mostro.getActiveOrders();
    console.log(`Se encontraron ${orders.length} órdenes activas`);

    orders.forEach((order, index) => {
      console.log(`\nOrden #${index + 1}:`);
      console.log(`- ID: ${order.id}`);
      console.log(`- Tipo: ${order.kind === OrderType.BUY ? 'Compra' : 'Venta'}`);
      console.log(`- Estado: ${order.status}`);
      console.log(`- Monto: ${order.amount === 0 ? 'Precio de mercado' : order.amount + ' sats'}`);
      console.log(`- Moneda: ${order.fiat_code}`);
      console.log(`- Monto fiat: ${order.fiat_amount}`);
      console.log(`- Método: ${order.payment_method}`);
      console.log(`- Premio: ${order.premium}%`);

      if (order.min_amount !== undefined && order.max_amount !== undefined) {
        console.log(`- Rango: ${order.min_amount}-${order.max_amount}`);
      }
    });

    const buyOrders = orders.filter((order) => order.kind === OrderType.BUY);
    const sellOrders = orders.filter((order) => order.kind === OrderType.SELL);

    console.log(`\nResumen:`);
    console.log(`- Órdenes de compra: ${buyOrders.length}`);
    console.log(`- Órdenes de venta: ${sellOrders.length}`);
  } catch (error) {
    console.error('Error durante la ejecución:', error);
  }
}

listOrdersExample().catch(console.error);

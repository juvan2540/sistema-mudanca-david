const ORS_API_KEY = '5b3ce3597851110001cf62489d28b52eaf1b4297a4e6f27f99881d70';

async function geocodificarNominatim(bairro, tipo) {
  try {
    const query = bairro + ', São Paulo, SP';
    const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const resultados = res.data;

    if (!resultados.length) throw new Error('Nenhuma localização encontrada.');

    const item = resultados[0];

    document.getElementById(tipo + 'Lat').value = item.lat;
    document.getElementById(tipo + 'Lon').value = item.lon;
    document.getElementById(tipo + '-sugestoes').innerHTML = `<p>Selecionado automaticamente: ${item.display_name}</p>`;

  } catch (e) {
    console.error('Erro ao buscar endereço:', e);
    alert('Erro ao buscar endereço. Verifique o bairro.');
  }
}

async function calcularDistanciaComLatLon() {
  try {
    const lat1 = parseFloat(document.getElementById('origemLat').value);
    const lon1 = parseFloat(document.getElementById('origemLon').value);
    const lat2 = parseFloat(document.getElementById('destinoLat').value);
    const lon2 = parseFloat(document.getElementById('destinoLon').value);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      alert('Por favor, selecione uma sugestão válida para origem e destino.');
      return 0;
    }

    const coordOrigem = [lon1, lat1];
    const coordDestino = [lon2, lat2];

    const rota = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      { coordinates: [coordOrigem, coordDestino] },
      { headers: { Authorization: ORS_API_KEY, 'Content-Type': 'application/json' } }
    );

    const distanciaKm = rota.data.features[0].properties.summary.distance / 1000;
    document.getElementById('distancia').innerText = `Distância estimada: ${distanciaKm.toFixed(2)} km`;

    if (window.rotaLinha) {
      window.mapaInstance.removeLayer(window.rotaLinha);
    }

    const coords = [ [lat1, lon1], [lat2, lon2] ];
    window.rotaLinha = L.polyline(coords, { color: 'blue' }).addTo(window.mapaInstance);
    window.mapaInstance.fitBounds(window.rotaLinha.getBounds());

    return distanciaKm;
  } catch (e) {
    console.error(e);
    alert('Erro ao calcular a distância.');
    return 0;
  }
}

function calcularMudanca() {
  const checkboxes = document.querySelectorAll('input[name="item"]:checked');
  const nomeCliente = document.getElementById('nomeCliente').value;
  const data = document.getElementById('dataMudanca').value;
  const orcamento = parseFloat(document.getElementById('orcamento').value) || 0;

  if (!nomeCliente || !data) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  let itensSelecionados = [];
  let volumeTotal = 0;

  checkboxes.forEach(item => {
    const nome = item.value;
    const volume = parseFloat(item.getAttribute("data-volume")) || 0;
    itensSelecionados.push(nome);
    volumeTotal += volume;
  });

  calcularDistanciaComLatLon().then(distancia => {
    const valorTotal = orcamento + (volumeTotal * 100) + (distancia * 5);
    const resultado = `
      <p><strong>Cliente:</strong> ${nomeCliente}</p>
      <p><strong>Data:</strong> ${data}</p>
      <p><strong>Itens:</strong> ${itensSelecionados.join(", ") || 'Nenhum item selecionado'}</p>
      <p><strong>Volume Total:</strong> ${volumeTotal.toFixed(2)} m³</p>
      <p><strong>Distância:</strong> ${distancia.toFixed(2)} km</p>
      <p><strong>Valor Total Estimado:</strong> R$ ${valorTotal.toFixed(2)}</p>
    `;
    document.getElementById("resultado").innerHTML = resultado;
    document.getElementById("btnSalvarPDF").style.display = "inline-block";
  });
}

function enviarWhatsAppEPrepararPDF() {
  const nomeCliente = document.getElementById('nomeCliente').value;
  const data = document.getElementById('dataMudanca').value;
  const resumo = document.getElementById('resultado').innerText;
  const texto = `Olá, sou ${nomeCliente}. Gostaria de solicitar uma mudança:
Data: ${data}
Resumo: ${resumo}`;
  const link = `https://wa.me/5511987012691?text=${encodeURIComponent(texto)}`;
  window.open(link, '_blank');
}

function salvarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Orçamento de Mudança", 10, 10);
  const texto = document.getElementById("resultado").innerText;
  const linhas = doc.splitTextToSize(texto, 180);
  doc.text(linhas, 10, 20);
  doc.save("orcamento-mudanca.pdf");
}

window.onload = function () {
  const mapa = L.map('mapa').setView([-23.5505, -46.6333], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);
  window.mapaInstance = mapa;
};
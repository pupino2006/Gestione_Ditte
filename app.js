// Configurazione Supabase (Le tue chiavi corrette)
const SUB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SUB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenJld2Nibm9xYnF2emNrb21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njk2NDUsImV4cCI6MjA4NjU0NTY0NX0.pdnPyYB4DwEjZ10aF3tGigAjiwLGkP-kx07-15L4ass";

const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// Gestione Navigazione
function showSection(id) {
    document.querySelectorAll('section, nav').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    // Auto-caricamento quando entri nelle sezioni
    if(id === 'section-entrata') popolaSelectDitte();
}

// Carica l'elenco ditte dalla tua tabella specifica
async function popolaSelectDitte() {
    const select = document.getElementById('ent-azienda');
    const { data, error } = await _supabase
        .from('Elenco_Ditte_Esterne')
        .select('Azienda')
        .order('Azienda', { ascending: true });

    if (!error) {
        select.innerHTML = '<option value="">-- Seleziona Azienda --</option>';
        data.forEach(ditta => {
            select.innerHTML += `<option value="${ditta.Azienda}">${ditta.Azienda}</option>`;
        });
    }
}

// Salva Entrata
async function salvaEntrata() {
    const azienda = document.getElementById('ent-azienda').value;
    const operatori = document.getElementById('ent-operatori').value;

    if (!azienda) return alert("Seleziona una ditta!");

    const { error } = await _supabase.from('visits').insert([
        { company_name: azienda, operators_count: parseInt(operatori), status: 'active' }
    ]);

    if (!error) {
        alert("Ingresso registrato!");
        showSection('home');
    }
}

// Carica chi è dentro per l'uscita
async function caricaPresenti() {
    const container = document.getElementById('lista-presenti');
    container.innerHTML = "Caricamento...";

    const { data, error } = await _supabase
        .from('visits')
        .select('*')
        .eq('status', 'active');

    if (!error) {
        container.innerHTML = data.length ? "" : "<p style='text-align:center;'>Nessuno in sede.</p>";
        data.forEach(item => {
            container.innerHTML += `
                <div class="card-visita">
                    <div>
                        <strong style="font-size:1.1rem;">${item.company_name}</strong><br>
                        <small style="color:#64748b;">${item.operators_count} persone</small>
                    </div>
                    <button class="btn-exit" onclick="salvaUscita(${item.id})">ESCI</button>
                </div>`;
        });
    }
}

async function salvaUscita(id) {
    await _supabase.from('visits').update({ exit_date: new Date(), status: 'closed' }).eq('id', id);
    caricaPresenti();
}

// Archivio
let datiArchivio = [];
async function caricaArchivio() {
    const container = document.getElementById('tabella-archivio');
    const { data, error } = await _supabase.from('visits').select('*').order('entry_date', {ascending: false});
    if(!error) {
        datiArchivio = data;
        let table = `<table style="width:100%; border-spacing:0; margin-top:10px;">
            <thead style="background:#f1f5f9;">
                <tr><th style="padding:10px; text-align:left;">Ditta</th><th style="padding:10px;">In</th><th style="padding:10px;">Out</th></tr>
            </thead><tbody>`;
        data.forEach(d => {
            const oraIn = new Date(d.entry_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            const oraOut = d.exit_date ? new Date(d.exit_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-';
            table += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px;">${d.company_name}</td>
                <td style="padding:12px; text-align:center;">${oraIn}</td>
                <td style="padding:12px; text-align:center;">${oraOut}</td>
            </tr>`;
        });
        table += `</tbody></table>`;
        container.innerHTML = table;
    }
}
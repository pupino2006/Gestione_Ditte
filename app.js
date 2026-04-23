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

// Gestisce la selezione nel select ditta
function gestisciSelezioneDitta() {
    const select = document.getElementById('ent-azienda');

    if (select.value === 'nuova-ditta') {
        apriModalNuovaDitta();
    }
}

// Apre il modal per nuova ditta
function apriModalNuovaDitta() {
    document.getElementById('modal-nuova-ditta').style.display = 'flex';
    document.getElementById('modal-nome-azienda').focus();
}

// Chiude il modal
function chiudiModal() {
    document.getElementById('modal-nuova-ditta').style.display = 'none';
    // Reset form
    document.getElementById('modal-nome-azienda').value = '';
    document.getElementById('modal-telefono').value = '';
    document.getElementById('modal-email').value = '';
    document.getElementById('modal-note').value = '';
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
        // Aggiungi opzione per nuova ditta
        select.innerHTML += '<option value="nuova-ditta">➕ Aggiungi nuova ditta</option>';
    }
}

// Salva nuova ditta dal modal
async function salvaNuovaDitta() {
    const nomeAzienda = document.getElementById('modal-nome-azienda').value.trim();
    const telefono = document.getElementById('modal-telefono').value.trim();
    const email = document.getElementById('modal-email').value.trim();
    const note = document.getElementById('modal-note').value.trim();

    if (!nomeAzienda) {
        alert("Il nome dell'azienda è obbligatorio!");
        return;
    }

    // Verifica se esiste già
    const { data: esistente } = await _supabase
        .from('Elenco_Ditte_Esterne')
        .select('Azienda')
        .eq('Azienda', nomeAzienda);

    if (esistente && esistente.length > 0) {
        alert("Questa ditta esiste già!");
        return;
    }

    // Prepara i dati da inserire
    const nuovaDitta = {
        Azienda: nomeAzienda
    };

    // Aggiungi campi opzionali solo se valorizzati
    if (telefono) nuovaDitta.Telefono = telefono;
    if (email) nuovaDitta.Email = email;
    if (note) nuovaDitta.Note = note;

    // Inserisci nuova ditta
    const { error } = await _supabase
        .from('Elenco_Ditte_Esterne')
        .insert([nuovaDitta]);

    if (!error) {
        alert("Ditta aggiunta con successo!");
        // Ricarica il select
        popolaSelectDitte();
        // Chiudi modal
        chiudiModal();
        // Seleziona la nuova ditta
        document.getElementById('ent-azienda').value = nomeAzienda;
    } else {
        alert("Errore nell'aggiunta della ditta: " + error.message);
    }
}

// Salva Entrata
async function salvaEntrata() {
    const azienda = document.getElementById('ent-azienda').value;
    const operatori = document.getElementById('ent-operatori').value;

    if (!azienda || azienda === 'nuova-ditta') return alert("Seleziona una ditta valida!");

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
                        <small style="color:#64748b;">${item.operators_count} persone</small><br>
                        <small style="color:#64748b;">${item.entry_date ? new Date(item.entry_date).toLocaleString('it-IT') : '-'}</small>
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
                <tr><th style="padding:10px; text-align:left;">Ditta</th><th style="padding:10px;">Persone</th><th style="padding:10px;">In</th><th style="padding:10px;">Out</th></tr>
            </thead><tbody>`;
        data.forEach(d => {
            const oraIn = new Date(d.entry_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            const oraOut = d.exit_date ? new Date(d.exit_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-';
            const dataIn = d.entry_date ? new Date(d.entry_date).toLocaleDateString('it-IT') : '-';
            const dataOut = d.exit_date ? new Date(d.exit_date).toLocaleDateString('it-IT') : '-';
            table += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px;">${d.company_name}</td>
                <td style="padding:12px; text-align:center;">${d.operators_count || 0}</td>
                <td style="padding:12px; text-align:center;">${dataIn}</td>
                <td style="padding:12px; text-align:center;">${dataOut}</td>
                <td style="padding:12px; text-align:center;">${oraIn}</td>
                <td style="padding:12px; text-align:center;">${oraOut}</td>
            </tr>`;
        });
        table += `</tbody></table>`;
        container.innerHTML = table;
    }
}

// Download Excel
function downloadExcel() {
    if (!datiArchivio.length) return alert("Nessun dato da esportare!");

    const datiFormattati = datiArchivio.map(d => ({
        'Ditta': d.company_name,
        'Persone': d.operators_count,
        'Data Entrata': new Date(d.entry_date).toLocaleDateString('it-IT'),
        'Ora Entrata': new Date(d.entry_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        'Data Uscita': d.exit_date ? new Date(d.exit_date).toLocaleDateString('it-IT') : '-',
        'Ora Uscita': d.exit_date ? new Date(d.exit_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-',
        'Stato': d.status
    }));

    const ws = XLSX.utils.json_to_sheet(datiFormattati);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Archivio Accessi');
    XLSX.writeFile(wb, `archivio_accessi_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Download PDF
function downloadPDF() {
    if (!datiArchivio.length) return alert("Nessun dato da esportare!");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const colonne = ['Ditta', 'Persone', 'In', 'Out', 'Stato'];
    const righe = datiArchivio.map(d => [
        d.company_name,
        d.operators_count,
        d.entry_date ? new Date(d.entry_date).toLocaleDateString('it-IT') : '-',
        d.exit_date ? new Date(d.exit_date).toLocaleDateString('it-IT') : '-',
        d.status
    ]);

    doc.autoTable({
        head: [colonne],
        body: righe,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 74, 153] }
    });

    doc.save(`archivio_accessi_${new Date().toISOString().split('T')[0]}.pdf`);
}
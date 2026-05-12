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
    if(id === 'home' || id === 'section-archivio') aggiornaTotalePresenze();
}

// Gestisce la selezione nel select ditta
function gestisciSelezioneDitta() {
    const select = document.getElementById('ent-azienda');

    if (select.value === 'nuova-ditta') {
        apriModalNuovaDitta();
    }
}

async function aggiornaTotalePresenze() {
    const homeBox = document.getElementById('total-presenze-home');
    const archiveBox = document.getElementById('total-presenze-archive');

    if (!homeBox && !archiveBox) return;

    const { data, error } = await _supabase
        .from('visits')
        .select('operators_count')
        .eq('status', 'active');

    let totale = 0;
    if (!error && Array.isArray(data)) {
        totale = data.reduce((sum, row) => sum + (row.operators_count || 0), 0);
    }

    const statusText = totale > 0 ? 'Persone dentro' : 'Stabilimento vuoto';
    const html = `
        <div class="total-counter">
            <div>
                <p>${statusText}</p>
                <strong>${totale}</strong>
            </div>
            <span>${totale > 0 ? 'ATTIVO' : 'INATTIVO'}</span>
        </div>
    `;

    if (homeBox) homeBox.innerHTML = html;
    if (archiveBox) archiveBox.innerHTML = html;
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
        let table = `<table style="width:100%; border-spacing:0; margin-top:10px;" id="tbl-archivio">
            <thead style="background:#f1f5f9;">
                <tr class="header-main">
                    <th style="padding:10px; text-align:left;" rowspan="2">Ditta</th>
                    <th style="padding:10px;" rowspan="2">Numero Persone</th>
                    <th style="padding:10px;" colspan="2">Entrate</th>
                    <th style="padding:10px;" colspan="2">Uscite</th>
                </tr>
                <tr class="header-sub">
                    <th style="padding:8px;">Data</th>
                    <th style="padding:8px;">Ora</th>
                    <th style="padding:8px;">Data</th>
                    <th style="padding:8px;">Ora</th>
                </tr>
            </thead><tbody>`;
        data.forEach(d => {
            const oraIn = d.entry_date ? new Date(d.entry_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-';
            const oraOut = d.exit_date ? new Date(d.exit_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-';
            const dataIn = d.entry_date ? new Date(d.entry_date).toLocaleDateString('it-IT') : '-';
            const dataOut = d.exit_date ? new Date(d.exit_date).toLocaleDateString('it-IT') : '-';
            const visitId = d.id;
            table += `<tr class="editable-row" data-id="${visitId}">
                <td class="cell-ditta" contenteditable="false">${d.company_name}</td>
                <td class="cell-persone" contenteditable="true" data-field="operators_count">${d.operators_count || 0}</td>
                <td class="cell-data-ingresso" contenteditable="true" data-field="entry_date_type" data-curval="${dataIn}">${dataIn}</td>
                <td class="cell-ora-ingresso" contenteditable="true" data-field="entry_date_time" data-curval="${oraIn}">${oraIn}</td>
                <td class="cell-data-uscita" contenteditable="true" data-field="exit_date_type" data-curval="${dataOut}">${dataOut}</td>
                <td class="cell-ora-uscita" contenteditable="true" data-field="exit_date_time" data-curval="${oraOut}">${oraOut}</td>
            </tr>`;
        });
        table += `</tbody></table>`;
        table += `<div style="margin-top:15px; color:#64748b; font-size:0.85rem;">Clicca due volte su una cella per modificarla, poi premi Invio o clicca fuori per salvare</div>`;
        container.innerHTML = table;
        
        // Aggiungi listener per l'editing
        attachEditListeners();
    }
}

function attachEditListeners() {
    // Usa event delegation per le celle editabili
    document.querySelectorAll('#tbl-archivio [contenteditable="true"]').forEach(cell => {
        let valoreOriginale = '';
        
        cell.addEventListener('focus', function() {
            valoreOriginale = this.textContent;
        });
        
        cell.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
        
        cell.addEventListener('blur', function() {
            const nuovoValore = this.textContent.trim();
            const vecchioValore = valoreOriginale.trim();
            
            if (nuovoValore !== vecchioValore) {
                salvaModifica(this);
            } else {
                this.textContent = vecchioValore; // Reset
            }
        });
    });
}

async function salvaModifica(cell) {
    const riga = cell.closest('.editable-row');
    const visitId = riga.dataset.id;
    const campo = cell.dataset.field;
    const nuovoValore = cell.textContent.trim();
    
    // Determina l'update da fare in base al campo
    let updateData = {};
    
    if (campo === 'operators_count') {
        const num = parseInt(nuovoValore);
        if (isNaN(num) || num < 0) {
            alert('Inserisci un numero valido!');
            cell.textContent = cell.dataset.curval || '0';
            return;
        }
        updateData.operators_count = num;
        cell.dataset.curval = nuovoValore;
    } else if (campo === 'entry_date_type' || campo === 'exit_date_type') {
        // Modifica data di entrata/uscita
        // Per la data, accettiamo formato italiano gg/mm/aaaa
        if (nuovoValore && nuovoValore !== '-') {
            // Verifica formato valido (semplice check)
            if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(nuovoValore)) {
                alert('Formato data non valido. Usa gg/mm/aaaa');
                cell.textContent = cell.dataset.curval || '-';
                return;
            }
            const [g, m, a] = nuovoValore.split('/');
            const nuovaData = new Date(`${a}-${m}-${g}T00:00:00`);
            if (isNaN(nuovaData.getTime())) {
                alert('Data non valida!');
                cell.textContent = cell.dataset.curval || '-';
                return;
            }
            
            if (campo === 'entry_date_type') {
                // Mantieni l'ora corrente
                const oraCell = riga.querySelector('.cell-ora-ingresso');
                const oraCorrente = oraCell && oraCell.dataset.curval ? oraCell.dataset.curval : '00:00';
                const [ore, minuti] = oraCorrente.split(':');
                nuovaData.setHours(ore, minuti, 0, 0);
                updateData.entry_date = nuovaData.toISOString();
                cell.dataset.curval = nuovoValore;
            } else {
                // exit_date
                const oraCell = riga.querySelector('.cell-ora-uscita');
                const oraCorrente = oraCell && oraCell.dataset.curval ? oraCell.dataset.curval : '00:00';
                const [ore, minuti] = oraCorrente.split(':');
                nuovaData.setHours(ore, minuti, 0, 0);
                updateData.exit_date = nuovaData.toISOString();
                cell.dataset.curval = nuovoValore;
            }
        } else {
            // Se vuoto o '-', imposta a null (non dovrebbe succedere per entry)
            if (campo === 'entry_date_type') {
                alert('La data di entrata non può essere vuota!');
                cell.textContent = cell.dataset.curval;
                return;
            } else {
                updateData.exit_date = null;
                cell.dataset.curval = '-';
            }
        }
    } else if (campo === 'entry_date_time' || campo === 'exit_date_time') {
        // Modifica ora (formato hh:mm)
        if (!/^\d{1,2}:\d{2}$/.test(nuovoValore) || !/^\d{1,2}:\d{2}$/.test(nuovoValore)) {
            const m = nuovoValore.match(/^(\d{1,2}):(\d{2})$/);
            if (!m) {
                alert('Formato ora non valido. Usa hh:mm');
                cell.textContent = cell.dataset.curval || '00:00';
                return;
            }
        }
        
        if (campo === 'entry_date_time') {
            const dataCell = riga.querySelector('.cell-data-ingresso');
            const dataCorrente = dataCell.dataset.curval;
            if (dataCorrente && dataCorrente !== '-') {
                const [g, m, a] = dataCorrente.split('/');
                const nuovaData = new Date(`${a}-${m}-${g}T${nuovoValore}:00`);
                updateData.entry_date = nuovaData.toISOString();
            } else {
                // Se non c'è data, usa oggi
                const oggi = new Date();
                const [ore, min] = nuovoValore.split(':');
                oggi.setHours(ore, min, 0, 0);
                updateData.entry_date = oggi.toISOString();
            }
            cell.dataset.curval = nuovoValore;
        } else {
            const dataCell = riga.querySelector('.cell-data-uscita');
            const dataCorrente = dataCell.dataset.curval;
            if (dataCorrente && dataCorrente !== '-') {
                const [g, m, a] = dataCorrente.split('/');
                const nuovaData = new Date(`${a}-${m}-${g}T${nuovoValore}:00`);
                updateData.exit_date = nuovaData.toISOString();
            } else {
                // Usa la data di entrata + ora nuova
                const entrataCell = riga.querySelector('.cell-data-ingresso');
                const entrataData = entrataCell.dataset.curval;
                if (entrataData && entrataData !== '-') {
                    const [g, m, a] = entrataData.split('/');
                    const nuovaData = new Date(`${a}-${m}-${g}T${nuovoValore}:00`);
                    updateData.exit_date = nuovaData.toISOString();
                } else {
                    const oggi = new Date();
                    const [ore, min] = nuovoValore.split(':');
                    oggi.setHours(ore, min, 0, 0);
                    updateData.exit_date = oggi.toISOString();
                }
            }
            cell.dataset.curval = nuovoValore;
        }
    }
    
    // Esegui l'update su Supabase
    const { error } = await _supabase
        .from('visits')
        .update(updateData)
        .eq('id', visitId);
    
    if (error) {
        alert('Errore nel salvataggio: ' + error.message);
        // Ripristina il valore originale
        cell.textContent = valoreOriginale;
    } else {
        // Ricarica l'archivio per coerenza
        setTimeout(() => caricaArchivio(), 300);
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

document.addEventListener('DOMContentLoaded', () => {
    aggiornaTotalePresenze();
});
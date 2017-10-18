chrome.runtime.sendMessage({
    todo: "showPageAction"
});

// tramite chiamata ajax scarica i dati statistici da fantagazzetta
// ritorna tramite cb un array di oggetti
function get_data(giocatori, cb) {
    giocatori = JSON.parse(giocatori);
    giocatori = giocatori['data']
    result = [];
    for (var i = 0; i < giocatori.length; i++) {
        var nome = giocatori[i][0].split(">")[1].split('</')[0];
        var partite = giocatori[i][1];
        var mediavoto = giocatori[i][2];
        var fantamedia = giocatori[i][3];
        var goal = giocatori[i][4];
        var assist = giocatori[i][5];
        var ammonizioni = giocatori[i][6];
        var espulsioni = giocatori[i][7];
        result.push({
            nome: nome,
            partite: partite,
            mediavoto: mediavoto,
            fantamedia: fantamedia,
            goal: goal,
            assist: assist,
            ammonizioni: ammonizioni,
            espulsioni: espulsioni

        });
        if (i == giocatori.length - 1) {
            cb(null, result);
        }
    }

}

// ritorna un array contenente tutti i giocatori in rosa
function estrai_rosa() {
    var rosa = [];
    $('.pname').each(function (index) {

        // prendo solo i primi 25 giocatori, escludo quelli eventualmente in campo quindi doppioni
        if (index < 25) {
            rosa.push(($(this).text().split('(')[0]));

        }
    });
    return rosa;
}

function clean_name(name) {
    return $.trim(name).toLowerCase().replace("'", "")
}

function cerca_giocatore(giocatore, lista_giocatori, cb) {
    for (var i = 0; i < lista_giocatori.length; i++) {
        if (clean_name(lista_giocatori[i].nome) == clean_name(giocatore)) {
            cb(null, lista_giocatori[i]);
        }
    }
}


function modifica_dom(statistiche) {

    var counter = 0;

    // Ridimensioni i div per fare entrare tutte le statistiche
    $('#allBlock > div:eq(1)').removeClass('col-lg-4').addClass('col-lg-6')
        .removeClass('col-md-4').addClass('col-md-6');
    $('#allBlock > div:eq(2)').removeClass('col-lg-8').addClass('col-lg-6')
        .removeClass('col-md-8').addClass('col-md-6');
    $('#allBlock > div:eq(3)').removeClass('col-lg-8').addClass('col-lg-6')
        .removeClass('col-md-8').addClass('col-md-6');;


    // aggiunta del thead
    $('#listacalciatori > table').append('<thead><tr><th>Ruolo</th><th>Nome</th><th>PG</th><th>MV</th><th>FM</th><th>G</th><th>AS</th><th>A</th><th>E</th></tr></thead>');

    $('#listacalciatori > table > tbody > tr').each(function (index) {

        // prendo solo i primi 25 giocatori, escludo quelli eventualmente in campo quindi doppioni
        if (index < 25) {
            $(this).append('<td>' + statistiche[counter].partite + '</td>');
            $(this).append('<td>' + statistiche[counter].mediavoto + '</td>');
            $(this).append('<td>' + statistiche[counter].fantamedia + '</td>');
            $(this).append('<td>' + statistiche[counter].goal + '</td>');
            $(this).append('<td>' + statistiche[counter].assist + '</td>');
            $(this).append('<td>' + statistiche[counter].ammonizioni + '</td>');
            $(this).append('<td>' + statistiche[counter].espulsioni + '</td>');
            counter++;

        }
    });

}

// estrae il timestamp necessario a per estrarre le statistiche dei giocatori
function get_timestamp() {
    return new Promise(function (resolve, reject) {
        var url = 'https://www.fantagazzetta.com/statistiche-serie-a/2017-18/fantagazzetta/riepilogo';
        $.get(url, function (data) {
            var stamp = $(data).find('#sttabs > li').data('stamp').replace("_", "");
            resolve(stamp);
        });
    })

}


function get_statistiche(url, x, y, rosa) {
    var statistiche = [];
    return new Promise(function (resolve, reject) {
        $.get(url, function (data) {
            get_data(data, function (err, giocatori) {
                for (var i = x; i < y; i++) {
                    cerca_giocatore(rosa[i], giocatori, function (err, res) {
                        statistiche.push(res);
                    });
                    if (i == y - 1) {
                        resolve(statistiche);
                    }
                }
            });
        });
    })
}


function get_indisponibili() {
    return new Promise(function (resolve, reject) {
        const url_indisponibili = 'https://www.fantagazzetta.com/indisponibili-serie-a#';

        $.get(url_indisponibili, function (data) {
            let giocatori = [];
            let d = $(data).find('.pad10');
            for (let i = 0; i < d.length; i++) {
                //d[i]
                let squalificati = $(d[i]).find('.pgroup:eq(0) >.top10');
                let indisponibili = $(d[i]).find('.pgroup:eq(1) > .top10');
                let indubbio = $(d[i]).find('.pgroup:eq(2) > .top10');

                for (let j = 0; j < indisponibili.length; j++) {
                    let indisponibile = $(indisponibili[j]).text();
                    let nome = indisponibile.split(":")[0]
                    let descrizione = indisponibile.split(":")[1]
                    let status = 'indisponibile'
                    if (nome !== '-') {
                        giocatori.push({
                            nome: nome,
                            descrizione: descrizione,
                            status: status
                        })
                    }
                }
                for (let j = 0; j < squalificati.length; j++) {
                    let squalificato = $(squalificati[j]).text();
                    if (squalificato !== '-') {
                        giocatori.push({
                            nome: squalificato,
                            status: 'squalificato'
                        })
                    }
                }

                for (let j = 0; j < indubbio.length; j++) {
                    let indubbio2 = $(indubbio[j]).text();
                    if (indubbio2 !== '-') {
                        let nome = indubbio2.split(':')[0];
                        let descrizione = indubbio2.split(':')[1];
                        let status = "dubbio";
                        giocatori.push({
                            nome: nome,
                            descrizione: descrizione,
                            status: status
                        })
                    }
                }
            }
            resolve(giocatori);

        })
    })

}

function modifica_dom_2(stats, rosa) {

    let indisponibili = []

    // colori necessari per la modifica del dom
    let rosso = '#D32F2F';
    let giallo = '#f0ad4e';
    let blu = '#5bc0de';

    // filtra tutti gli indisponibili ed aggiunge ad un array solo quelli presenti nella rosa
    for (let i = 0; i < stats.length; i++) {
        for (let j = 0; j < rosa.length; j++) {
            if (clean_name(stats[i].nome) == clean_name(rosa[j])) {
                indisponibili.push(stats[i])
            };
        }
    }

    // Modifica il dom mostrando le informazioni
    $('#listacalciatori > table > tbody > tr > .pname').each(function (index) {
        let name = $(this).text();
        name = name.split("(")[0]
        name = clean_name(name);
        for (let i = 0; i < indisponibili.length; i++) {

            // se il giocatore fa parte della lista degli indisponibili 
            if (name == clean_name(indisponibili[i].nome)) {

                // se fa parte degli squalificati
                if (indisponibili[i].status == 'squalificato') {
                    $(this).css({
                        'color': rosso
                    }).attr('title', 'Squalificato')
                    tippy(this);
                }

                // se fa parte degli indisponibili
                if (indisponibili[i].status == 'indisponibile') {
                    $(this).css({
                        'color': giallo
                    }).attr('title', "Indisponibile: " + indisponibili[i].descrizione)
                    tippy(this);
                }

                // se fa parte dei giocatori in dubbio
                if (indisponibili[i].status == 'dubbio') {
                    $(this).css({
                        'color': blu
                    }).attr('title', "In dubbio: " + indisponibili[i].descrizione)
                    tippy(this);

                }


            }
        }
    })
}

function get_probabili_formazioni() {
    const url = 'https://www.fantagazzetta.com/probabili-formazioni-serie-a';
    let giocatori = []
    return new Promise(function (resolve, reject) {
        $.get(url, function (data) {

            $(data).find('.p10').each(function (index) {
                $(this).find('.pgroup').each(function (index) {

                    let name = $(this).find('.pname2 > a').text();
                    let perc = $(this).find('.perc').text();
                    if (perc) {
                        giocatori.push({
                            name: name,
                            perc: perc
                        })
                    } else {
                        perc = $(this).find('.bold').text().split(".")[2].trim();
                        giocatori.push({
                            name: name,
                            perc: perc
                        })
                    }
                })

            });

            resolve(giocatori)
        });
    })

}

// Modifica il dom mostrando le percentuali di titolarità
function modifica_dom_3(lista_giocatori, rosa) {
    let stats = [];
    for (let i = 0; i < lista_giocatori.length; i++) {
        for (let j = 0; j < rosa.length; j++) {
            let a = lista_giocatori[i];
            let b = clean_name(rosa[j]);
            if (clean_name(a.name) == b) stats.push({
                nome: clean_name(a.name),
                perc: a.perc
            })
        }
    }
    $('#listacalciatori > table > tbody > tr').each(function (index) {

        // prendo solo i primi 25 giocatori, escludo quelli eventualmente in campo quindi doppioni
        if (index < 25) {
            let nome = $(this).find('.pname').text();
            nome = clean_name(nome).split('(')[0];
            let self = this;
            cerca_giocatore(nome, stats,function(err, giocatore){
                $(self).find('.tdrole').append(" " + giocatore.perc)
            })

        }
    });


}

$(document).ready(function () {

    get_timestamp().
    then(function (stamp) {
        var statistiche = []

        // pg, mv, mf, goal, assist, amm, esp
        var url_portieri = 'https://content.fantagazzetta.com/web/statistiche/tabelle/2017-18/fantagazzetta/riepilogo/portieri_' + stamp + '.txt';

        var url_difensori = 'https://content.fantagazzetta.com/web/statistiche/tabelle/2017-18/fantagazzetta/riepilogo/difensori_' + stamp + '.txt';

        var url_centrocampisti = 'https://content.fantagazzetta.com/web/statistiche/tabelle/2017-18/fantagazzetta/riepilogo/centrocampisti_' + stamp + '.txt';

        var url_attaccanti = 'https://content.fantagazzetta.com/web/statistiche/tabelle/2017-18/fantagazzetta/riepilogo/attaccanti_' + stamp + '.txt';



        // array contenente la lista della propria rosa
        var rosa = estrai_rosa();


        var stats = [];

        Promise.all([
            get_statistiche(url_portieri, 0, 3, rosa),
            get_statistiche(url_difensori, 2, 11, rosa),
            get_statistiche(url_centrocampisti, 11, 19, rosa),
            get_statistiche(url_attaccanti, 19, 25, rosa),
            get_indisponibili(),
            get_probabili_formazioni()
        ]).then(function (statistiche) {
            // stat portieri 
            stats = stats.concat(statistiche[0]);
            // stat difensori
            stats = stats.concat(statistiche[1]);
            // stat centrocampisti
            stats = stats.concat(statistiche[2]);
            // stat attaccanti
            stats = stats.concat(statistiche[3]);

            // passo le statistiche alla funzione che modifica il DOM
            // per mostrare le varie statistiche (media, goal, assist ecc)
            modifica_dom(stats);

            // modifico il dom per mostrare gli eventuali indisponibili 
            modifica_dom_2(statistiche[4], rosa);

            modifica_dom_3(statistiche[5], rosa);
        })
    });


});
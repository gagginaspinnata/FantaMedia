$(document).ready(function() {
    var search = $('#search');
    var result =$('#result');
    search.on('click', function(){
        result.append('Premuto');
    });
});
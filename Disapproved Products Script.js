var SPREADSHEET = "https://docs.google.com/spreadsheets/d/1Ey99QqnjbihT3Qb6";
function main() {
  
  var gmc_ids_and_emails = get_gmc_ids_and_emails();
  verify_products_status(gmc_ids_and_emails);
  
}

function get_gmc_ids_and_emails(){
 var gmc_ids_and_emails = {};
 var sheetdata = SpreadsheetApp.openByUrl(SPREADSHEET).getSheetByName("main").getRange("A:B").getValues();
 for (i=1;i<sheetdata.length;i++){
    if( sheetdata[i][0] != ""){
      var gmc_id = sheetdata[i][0];
      var gmc_email = sheetdata[i][1];
      gmc_ids_and_emails[gmc_id] = [gmc_id,gmc_email];
    }
 }
 return gmc_ids_and_emails;
}

function verify_products_status(gmc_ids_and_emails){
  
  for(var gmc in gmc_ids_and_emails){
    var gmc_id = gmc_ids_and_emails[gmc][0];
    var gmc_email = gmc_ids_and_emails[gmc][1];
    var previous_dissaproved_products = get_previous_dissaproved_products(gmc_id);
    var dissaproved_products = get_dissaproved_products(gmc_id);
    update_disapproved_products_sheet(dissaproved_products,gmc_id);
    send_alert_email(previous_dissaproved_products,dissaproved_products,gmc_email,gmc_id);
  }
}


function get_previous_dissaproved_products(gmc_id){
  var previous_dissaproved_products = [];
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET);
  if (ss.getSheetByName(gmc_id) == null){
   Logger.log("Creating sheet for GMC "+gmc_id); 
   ss.insertSheet().setName(gmc_id);
   return previous_dissaproved_products;
  }
  var sheetdata = SpreadsheetApp.openByUrl(SPREADSHEET).getSheetByName(gmc_id).getRange("A:A").getValues();
  for (i=0;i<sheetdata.length;i++){
    if( sheetdata[i][0] != ""){
      previous_dissaproved_products.push(sheetdata[i][0]);
    }
  }
  return previous_dissaproved_products;
}

function get_dissaproved_products(gmc_id){
  var dissaproved_products = {}
  var totalProducts = 0;
  var pageToken;
  do {
    var productStatuses = ShoppingContent.Productstatuses.list(gmc_id, {pageToken: pageToken});
    if (productStatuses.resources) {
      for (var i = 0; i < productStatuses.resources.length; i++) {
        product = productStatuses.resources[i];
        for(j=0;j<product['destinationStatuses'].length;j++){
          if (product['destinationStatuses'][j]['approvalStatus'] == 'disapproved') {
              if(product['itemLevelIssues'] == undefined) {
                var reason = "Disapproval reason not found";
              }else{
                var reason = product['itemLevelIssues'][0].detail;
              }; 
              dissaproved_products[product.productId] = {
                id:product.productId,
                title:product.title,
                reason: reason
              }
          }
        }
      }
    } else {
      Logger.log('No more products in account ' + merchantId);
    }
    pageToken = productStatuses.nextPageToken;
  } while (pageToken);
  
  return dissaproved_products;
}

function update_disapproved_products_sheet(dissaproved_products,gmc_id){
  var sheet = SpreadsheetApp.openByUrl(SPREADSHEET).getSheetByName(gmc_id);
  sheet.clear();
  for (product_id in dissaproved_products){
    sheet.appendRow([dissaproved_products[product_id].id]);
  }
}


function send_alert_email(previous_dissaproved_products,dissaproved_products,gmc_email,gmc_id){
  var msg = "";
  for(var p in dissaproved_products){
    var pid = dissaproved_products[p].id;
    var ptitle = dissaproved_products[p].title;
    var reason = dissaproved_products[p].reason;
    if(previous_dissaproved_products.indexOf(pid) < 0) {
      msg += "\n" + ptitle + " (Product Id: " + pid + ")."+ "\n" + "Explanation: " + reason + "\n"; 
    }
  }
  if(msg!=""){
   var intro = "Hi!\n\nSome products in GMC id " + gmc_id + " were disapproved\n\n";
   msg = intro + msg;
   MailApp.sendEmail(gmc_email, "Disapproved Products in GMC id "+gmc_id, msg)
  }
}
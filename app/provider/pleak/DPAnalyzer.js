module.exports = function(elementRegistry) {
for (var key in elementRegistry._elements) {
    var element = elementRegistry.get(key);
    console.log(element);
}};
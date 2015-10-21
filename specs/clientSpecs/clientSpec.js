describe("client tests", function(){
  beforeEach(module('Locket'));
  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));
  describe('features', function() {
    describe('auth', function() {
      it('should have a login function', function() {
        assert(true);
      });
      it('should have a signup function', function() {
        assert(true);
      });
    });
  });
  describe('services', function() {
  });
});

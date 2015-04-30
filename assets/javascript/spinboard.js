;(function( $ ) {
	"use strict";
	var spinboard = {
		constant: { //holds all constants 'things that do not change over the life of the application'
			SECOND: 1000,
			CIRCUM: ( 2 * Math.PI ) //circumference of circle in radians
		},
		config: { //any data that can be changed to affect the application goes here
			animation: {
				fps: 60 //frames per second, browsers run at around 60 fps
			},
			needle: {
				size: function( size ) { //want the needle length to be 85% of the circle radius
					return ( size * 0.85 );
				},
				max_velocity: 25, //in rads/sec
				friction: 0.2 //amount of velocity to remove per second
			}
		},
		elem: {}, //holds all jQuery page elements from dom
		pages: {}, //holds all pages (jQuery objects)
		page_curr: null, //current page that is active (page name)
		options: ['Option 1','Option 2','Option 3','Option 4','Option 5'], //available options
		curr_options: [], //currently selected options
		canvas: {}, //holds canvas data such as width, height, context
		data: {}, //holds any relavant data used for animation, defined to reduce the amount of very specific global vars
		render_page: function( page ) { //handles the closing (if necessary) and opening of all pages. runs setup code to prep pages before display
			if ( this.page_curr !== null && this.page_curr !== page ) {
				this.pages[this.page_curr].slideUp(); //if there is a current page, hide that mofo
			}
			switch( page ) {
				case 'main':
					this.elem.options.empty(); //clear out all old options so we can put a fresh set in (in case one as added or removed)
					var option_none_template = '<div class="e-wppo-none">No options added</div>';
					var option_template = '<div class="e-wppo-option"><a class="e-wppoo-action t-delete" href="">DELETE</a><div class="e-wppoo-name"></div><div class="e-wppoo-clear"></div></div>';
					if ( this.curr_options.length === 0 ) {
						$(option_none_template).appendTo( this.elem.options ); //if no options, put 'none' template in
						break;
					}
					var that = this;
					for( var i in this.curr_options ) { //loop through options, create copy of 'option' template, and fill out. add to bottom of options container
						(function( i ) { //run self executing function to provide better scoping for variables in closures
							var option = $(option_template); //use jquery to create all dom ready elements based on template
							option.find('.e-wppoo-name').text( that.curr_options[i].name ); //fill the name in
							option.find('.e-wppoo-action.t-delete').on('click.spinboard',function(e) { //add an action to run when someone clicks 'delete'
								e.preventDefault(); //prevent the link from acting like a link
								option.fadeOut('fast',function() { //fade out option, after animation completes, remove from curr_options array and from dom
									that.option_remove( i );
									option.remove();
								});
								return false; //prevents link for working as expected (older way to do same function as preventDefault() above, but left in for good measure in case preventDefault() isn't listened to)
							});
							option.appendTo( that.elem.options ); //now that we prepped a bitch, insert her gently into the options div
						})( i );
					}
					break;
				case 'option_add':
					this.elem.option_name.empty(); //clear out name dropdown to rebuild with proper options (in case one is in use or is available again)
					var options = []; //container for options list
					for( var i in this.options ) { //loop through options, check if they are current in use, if not add to 'options' array
						var found = false;
						for ( var ii in this.curr_options ) { //loop through current options
							if ( this.curr_options[ii].idx !== i ) { //if current option is not equal to the main option, then skip
								continue;
							}
							found = true;
							break;
						}
						if ( found ) { //if item found in current options, do not add to options list
							continue;
						}
						options.push({
							name: this.options[i],
							value: i
						});
					}
					//add custom ability
					options.push({
						name: 'Custom',
						value: '__custom__'
					});
					for( var i in options ) { //insert all options into dropdown
						$('<option></option>').attr('value',options[i].value).text(options[i].name).appendTo( this.elem.option_name );
					}
					this.elem.option_name.trigger('change'); //trigger change on page load just in case 'custom' is still selected. this causes the 'custom name' to show itself otherwise you would need to make a 'change' manually before it would show
					break;
				case 'board':
					var template = '<div class="e-wppoc-option"><div class="e-wppoco-color"></div><div class="e-wppoco-name"></div></div>'; //template for option color display
					this.elem.option_colors.empty(); //clear out colors in case options have changed
					for( var i in this.curr_options ) { //loop through current options, clone template, fill out and insert into page
						var option_color = $(template);
						option_color.find('.e-wppoco-color').css( 'background-color',this.curr_options[i].color );
						option_color.find('.e-wppoco-name').text( this.curr_options[i].name );
						option_color.appendTo( this.elem.option_colors );
					}
					this.elem.spin_button.show(); //show spin button incase it has been hidden by an earlier use of the system
					this.setup();
					this.draw_board();
					break;
				case 'winner':
					//show winner
					this.elem.winner_name.text( this.curr_options[this.data.winner].name ); //fill in winner name into div on page
					break;
			}
			this.elem.pages.prepend( this.pages[page] ); //move page to top so the slideDown effect looks right, if it is below the last page, it appears to slide up. this solves that
			this.pages[page].slideDown(); //show page
			this.page_curr = page; //update curr page
		},
		init: function( config ) {
			if ( typeof config === 'object' ) { //if config is passed as object literal then merge with the default config defined earlier
				$.extend( true,this.config,config );
			}
			var that = this; //reference to this object since closures (anonymous functions) can define the value of 'this' themselves and won't inherit this from the parent scope
			//bind element jQuery objects to identifiers in 'elem' object to make them easy to reference later on and reduce the amount of DOM traversal
			this.elem.wrapper = $('.l-wrapper');
			this.elem.pages = this.elem.wrapper.find('> .e-w-pages');
			this.elem.pages.find('> .e-wp-page').each(function(i) { //loop through each page found and add to 'pages' object so they are easy to interact with
				var $this = $(this);
				var name = $this.data('page');
				that.pages[name] = $this;
			});
			//page 'main'
			this.elem.options = this.pages.main.find('.js-options');
			this.pages.main.find('.js-option-add').on('click.spinboard',function(e) { //add functionality to 'option add' button
				e.preventDefault(); //stop link from acting like it's mama taught it
				that.render_page('option_add'); //show the damn option add page, jeez
				return false;
			});
			this.pages.main.find('.js-continue').on('click.spinboard',function(e) { //add functionality to 'continue' button, if they have defined enough options, go to board page
				e.preventDefault();
				if ( that.curr_options.length <= 1 ) { //check if they have the minimum options needed, if not, send 'alert'
					alert('At least 2 options are required');
					return false;
				}
				that.render_page('board'); //load the motherfuckin' board page
				return false;
			});
			//page 'option-add'
			this.elem.option_name              = this.pages.option_add.find('.js-option-name');
			this.elem.option_custom_name_field = this.pages.option_add.find('.js-option-custom-name-field');
			this.elem.option_custom_name       = this.pages.option_add.find('.js-option-custom-name');
			this.elem.option_weight            = this.pages.option_add.find('.js-option-weight');
			this.elem.option_custom_name_field.hide();
			this.elem.option_name.on('change.spinboard',function() { //check to see if 'custom' option is selected, if so show custom name field, otherwise hide it
				var $this = $(this);
				if ( $this.val() === '__custom__' ) {
					that.elem.option_custom_name_field.slideDown();
				}
				else {
					that.elem.option_custom_name_field.slideUp();
				}
			});
			this.pages.option_add.find('.js-add').on('click.spinboard',function(e) { //handle clicking of 'add' button
				e.preventDefault();
				that.option_add();
				return false;
			});
			this.pages.option_add.find('.js-back').on('click.spinboard',function(e) { //handle backing that thang up
				e.preventDefault();
				that.render_page('main'); //go to main page because they pussied out
				return false;
			});
			//page 'board'
			this.elem.option_colors = this.pages.board.find('.js-option-colors');
			//get canvas info, define variables to hold values that are used often like canvas center (reduces amount of calculations)
			this.elem.canvas = this.pages.board.find('.js-canvas')[0];
			this.canvas.width = this.elem.canvas.width;
			this.canvas.height = this.elem.canvas.height;
			this.canvas.center = {
				x: Math.floor( this.canvas.width / 2 ),
				y: Math.floor( this.canvas.height / 2 )
			};
			this.canvas.radius = Math.floor( this.canvas.width / 2 );
			this.canvas.context = this.elem.canvas.getContext('2d'); //get context we want to work in, only know of 2d support at this time
			this.elem.spin_button = this.pages.board.find('.js-spin');
			this.elem.spin_button.on('click.spinboard',function(e) { //add action when 'spin' button is clicked
				e.preventDefault();
				that.data.angular_velocity = ( that.config.needle.max_velocity + ( Math.random( 0,that.constant.CIRCUM ) ) ); //set the velocity of the needle to the max velocity defined in config, plus a random angle between 0 and the cirumference of a circle
				$(this).fadeOut(); //hide button
				that.do_animation( that.data.start_time ); //make the monkey dance/spin needle, whatever you prefer
				return false;
			});
			//page 'winner'
			this.elem.winner_name = this.pages.winner.find('.js-winner-name');
			this.pages.winner.find('.js-retry').on('click.spinboard',function(e) { //add action to 'retry' button, reset all animation related data to defaults and go back to board page
				e.preventDefault();
				that.init_data(); //reset data
				that.render_page('board'); //go to board page because our first fucking answer wasn't good enough for the prick
				return false;
			});
			this.pages.winner.find('.js-reset').on('click.spinboard',function(e) { //add action to kill everything we worked so hard for
				e.preventDefault();
				that.render_page('main'); //go back to main page :(
				return false;
			});
			//start a bitch
			this.render_page('main'); //llleeeeeeeerrrrrooooooyyyyy jjjjaaaaaannnnkkkiiiiiiinnnns
		},
		random_color: function() { //get a random color, check if it has been used before, if so repeat until we find one that hasn't been used (it's a recursive mofo)
			var color = "#000000".replace( /0/g,function() {
					return (~~(Math.random()*16)).toString(16); //hexidecial is base 16 which explains the numbers use here
			} );
			for( var i in this.curr_options ) {
				if ( color === this.curr_options[i].color ) { //if color has been found, try, try, try again
					return this.random_color();
				}
			}
			return color;
		},
		option_add: function() { //validate adding of option, if they shall pass, add the option to the curr_options array
			var errors = [];
			var name   = this.elem.option_name.val(); //get input value
			var weight = this.elem.option_weight.val(); //get input value
			//shit below should be self explanitory
			if ( name === '' ) {
				errors.push('Option Name is required');
			}
			else if ( name !== '__custom__' && typeof this.options[name] === 'undefined' ) {
				errors.push('Option Name is not valid');
			}
			if ( name === '__custom__' ) {
				var custom_name = this.elem.option_custom_name.val();
				if ( custom_name === '' ) {
					errors.push('Custom Name is required');
				}
				else if ( custom_name.length > 30 ) {
					errors.push('Custom Name cannot be longer than 30 characters');
				}
			}
			if ( weight === '' ) {
				errors.push('Option Weight is required');
			}
			else if ( !/^[0-9]+$/.test( weight ) ) {
				errors.push('Option Weight must be a positive number');
			}
			else {
				//make sure string integer converts properly
				weight = parseInt( weight );
				if ( weight <= 0 ) {
					errors.push('Option Weight must be greater than 0');
				}
			}
			if ( errors.length > 0 ) {
				alert( errors.join('\n') );
				return;
			}
			this.curr_options.push({
				idx: name,
				name: ( name !== '__custom__' ? this.options[name] : custom_name ),
				weight: weight,
				color: this.random_color()
			});
			//clear out values so they don't show up next time you add an item
			this.elem.option_name.val('');
			this.elem.option_custom_name.val('');
			this.elem.option_weight.val('');
			this.render_page('main'); //go back to main page just because i can
		},
		option_remove: function( idx ) { //remove option from curr_options, used instead of filter for compatibility reason and the need to retain indexes
			var options = [];
			for ( var i in this.curr_options ) {
				if ( idx === i ) {
					continue;
				}
				options[i] = this.curr_options[i];
			}
			this.curr_options = options;
		},
		init_data: function() { //setup initial data for animation
			this.data.frame = 0;
			this.data.then = window.performance.now();
			this.data.start_time = this.data.then;
			this.data.needle_angle = 0;
			this.data.angular_velocity = 0;
			this.data.stop = false;
		},
		setup: function() { //compile option data, get proper angles to render 'pie' pieces
			//use caution, maths below
			var total_weight = this.curr_options.reduce( function( p,c ) { //go through array adding previous value to current value until we are left with only one
				return ( p + c.weight );
			},0 );
			var curr_angle = 0;
			for ( var i in this.curr_options ) { //calculate start and end angles for each arc we need to render
				this.curr_options[i].angle_start = curr_angle;
				var arc_size = ( this.constant.CIRCUM * ( this.curr_options[i].weight / total_weight ) );
				this.curr_options[i].angle_end = ( curr_angle + arc_size );
				curr_angle = this.curr_options[i].angle_end;
			}
			//define some basic data
			this.data = {
				fps_interval: ( this.constant.SECOND / this.config.fps ),
				 needle_size: ( typeof this.config.needle.size === 'function' ? this.config.needle.size.apply( this,[this.canvas.radius] ) : this.config.needle.size )
			};
			this.init_data();
		},
		draw_board: function() { //render the 'spinboard'
			//clear drawing area
			this.canvas.context.clearRect( 0,0,this.canvas.width,this.canvas.height );
			//draw circle
			for ( var i in this.curr_options ) {
				var piece = this.curr_options[i];
				this.canvas.context.save(); //save 'pen' location
				this.canvas.context.beginPath();
				this.canvas.context.moveTo( this.canvas.center.x,this.canvas.center.y ); //move 'pen' to center of canvas and draw arc
				this.canvas.context.arc( this.canvas.center.x,this.canvas.center.y,this.canvas.radius,piece.angle_start,piece.angle_end,false );
				this.canvas.context.closePath();
				this.canvas.context.fillStyle = piece.color; //set color
				this.canvas.context.fill(); //fill her up nice in full like
				this.canvas.context.restore(); //restore the 'pen' back to where it was
			}
			//draw needle
			this.canvas.context.save(); //save 'pen' location
			this.canvas.context.beginPath();
			this.canvas.context.moveTo( this.canvas.center.x,this.canvas.center.y ); //move 'pen' to center of canvas
			var end = {
				x: ( this.canvas.center.x + ( this.data.needle_size * Math.cos( this.data.needle_angle ) ) ),
				y: ( this.canvas.center.y + ( this.data.needle_size * Math.sin( this.data.needle_angle ) ) )
			};
			this.canvas.context.lineTo( end.x,end.y ); //draw needle
			this.canvas.context.lineWidth = 5; //not too girthy but just right
			this.canvas.context.lineCap = 'round';
			this.canvas.context.stroke(); //gigiddy
			this.canvas.context.restore(); //put 'pen' back where you found it
		},
		do_animation: function( newtime ) { //looping function that renders each frame
			if ( this.data.stop ) { //i said stop motherfucker, jeez
				return;
			}
			var that = this;
			window.requestAnimationFrame(function( newtime ) { //ask browser for more of that 'animation' shit she's been dealing
				that.do_animation( newtime );
			});
			// calc elapsed time since last loop
			var elapsed = ( newtime - this.data.then );
			if ( elapsed <= this.data.fps_interval ) { //if it hasn't been long enough for use to render a frame, stop
				return;
			}
			this.data.frame++; //increase frame number
			this.data.then = ( newtime - ( elapsed % this.data.fps_interval ) ); //set timestamp so next loop starts over the count
			if ( this.data.frame > this.config.fps ) { //if the frame number has gone over the FPS defined, set back to 1
				this.data.frame = 1;
			}
			
			//multiply velocity by the amount of speed we should lose this frame
			this.data.angular_velocity = ( this.data.angular_velocity * ( 1 - ( this.config.needle.friction / this.config.animation.fps ) ) );
			
			this.data.needle_angle += ( this.data.angular_velocity / this.config.animation.fps ); //add the angle change for this frame to total angle needle
			if ( this.data.needle_angle > this.constant.CIRCUM ) { //not needed, as the canvas functions understood how to handle angles large then 2pie, but it felt like i needed to do this
				this.data.needle_angle = ( this.data.needle_angle - ( this.constant.CIRCUM * Math.floor( this.data.needle_angle / this.constant.CIRCUM ) ) );
			}
			
			if ( this.data.angular_velocity < 0.1 ) { //if velocity gets low enough, just kill it....with fire
				this.data.stop = true; //since we already asked to be ran again, we have to just set this varible and wait until the next call to actually stop the rendering
				setTimeout( function() { //wait a second and finish....all over dem tatties
					that.finish();
				},this.constant.SECOND );
				return;
			}
			
			this.draw_board(); //draw it like them french girls
		},
		finish: function() { //finish it, check to see if needle angle after stop is between the start and end angles of any piece
			var winner;
			for ( var i in this.curr_options ) {
				var piece = this.curr_options[i];
				if ( this.data.needle_angle < piece.angle_start || this.data.needle_angle > piece.angle_end ) {
					continue;
				}
				winner = piece;
				break;
			}
			this.data.winner = i; //set winner
			this.render_page('winner'); //got to page to show them
		}
	};
	$(document).ready(function() { //when shes ready, do it
		spinboard.init();
	});
})( jQuery );
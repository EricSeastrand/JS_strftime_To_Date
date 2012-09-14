/*****************************************************************
****  https://github.com/willcodeforfood/JS_strftime_To_Date  ****
****                                                          ****
****   Created by Eric Seastrand -- eric@ericseastrand.com    ****
****   This code is license-free. Consider it public-domain!  ****
****                                                          ****
****   If you find it helpful, it would make my day to see    ****
****      your comments on my GitHub page above!              ****
*****************************************************************/

/*****************************************************************
*	example usage:
*	
*	strftime_To_Date('2043-12-01', '%Y-%m-%d');
*	strftime_To_Date('12-01-2043', '%m-%d-%Y');
*	strftime_To_Date('12-01-2043', '%m-%d-%Y', { dateIsInPast: true });
*		Throws Exception: {
*			message: "Tue Dec 01 2043 is in the future. Date must be in the past.",
*			type: "INPUT_SANITY_FUTURE",
*			debug: {
*				format: "%m-%d-%Y"
*				regex: /(\d+)\-(\d+)\-(\d+)/
*				timeString: "12-01-2043"
*			}
*		}
*	You can catch this exception to display the error message to the user.
*		try {
*			strftime_To_Date('12-01-2043', '%m-%d-%Y', { dateIsInPast: true });
*		} catch(e) {
*			alert(e.message); // Let the user know their date is invalid.
*			console.log(e);   // Log the exception to the console to see debugging data.
*		}
*
*
****************************************************************************/
(function(){
"use strict";
	var self = {
		// Save some CPU power by instantiating these RegExp objects only once.
		regex_extractPlaceholders: /\%(\w)/g,
		regex_escapeRegexReservedChars: /[-[\]{}()*+?.,\\^$|#\s]/g
	};

	window.strftime_To_Date = function( timeString, formatString, validateInput ) {
		var placeHolders, extractionRegexp, values, dateParts, dateObj;
		try {
			
			// Pull the %d, %m, %y, etc... out of the format string.
			placeHolders     = extractPlaceholdersAsArray( formatString );
			
			// Now that we know where the values got plugged in, we can build a regex to extract them in a known order.
			extractionRegexp = buildRegexToExtractValues( formatString, placeHolders );
			values           = pullValuesOutOfFormattedTime( timeString, extractionRegexp )
			
			dateParts        = buildDateDatastructure( placeHolders, values );
			
			dateObj = new Date(
				dateParts.fullYear,
				dateParts.month - 1, // This field is zero-indexed, starting with January=0. Humans are used to January=1.
				dateParts.day,
				dateParts.hour,
				dateParts.minute,
				dateParts.second,
				dateParts.millisecond
			);
			
			if( validateInput )
				checkSanity( dateParts, dateObj, validateInput );
			
			return dateObj;
		} catch( e ) {
			throw new ExceptionHandler( e, timeString, formatString, extractionRegexp );
		}
	};
	
	
	
	///////////////////////////////////////////////////////////////////////
	//                                                                   //
	//                         UTILITY FUNCTIONS                         //
	//                                                                   //
	///////////////////////////////////////////////////////////////////////
	
	// Pulls out an array of the %x placeholders in the formatting string.
	function extractPlaceholdersAsArray(formatString) {
		return formatString.match( self.regex_extractPlaceholders );
	}
	
	// Creates a regex based on the formatString, to pull y/m/d values out of the formatted timeString.
	function buildRegexToExtractValues( formatString, variableNames ) {
		// Before the format can be used as a regex, we must escape out any characters that have a different meaning to the regexp engine.
		formatString = _escapeRegexReservedChars( formatString );
		
		// Replace all of the %d, %m, %y, etc... with regex digit classes
		for(var i=0; i<variableNames.length; i++){
			formatString = formatString.replace(variableNames[i], '(\\d+)');
		}
		// Resulting pattern will look something like this: (d+)\-(d+)\-(d+)
		
		// Make and return a RegExp object with the pattern we just built.
		return new RegExp( formatString );
	}
	
	function pullValuesOutOfFormattedTime( timeString, extractionRegexp ) {
		// Use the RegExp to pull out the values for %m, %d, %y, etc...
		var extractedValues = extractionRegexp.exec( timeString );
		
		if(!extractedValues) // Regex didn't match anything.
			throw new Exception_Parse_Value();
		
		// The entire @timeString will always match the regex, and end up in @extractedPieces[0]. Trim this off so the indices line up.
		extractedValues.shift();
		
		return extractedValues;
	}
	
	// Builds an object containing the parsed-out date values
	function buildDateDatastructure( placeHolders, values ) {
		// undefined values get cast into the string 'undefined', causing "new Date()" to complain.
		var dP = {fullYear:0, month:1, day:1, hour:0, minute:0, second:0, millisecond:0};
		for(var i=0; i<placeHolders.length; i++) {
			values[i] = parseInt( values[i], 10 ); // Leading zeros cause parseInt to treat input as base8. Specify base10 instead.
			switch( placeHolders[i] ) {
				case  '%Y'  : dP.fullYear    = values[i];           break;
				case  '%y'  : dP.fullYear    = values[i] + 2000;    break; // 2 digit form of year -- assume 20xx
				case  '%m'  : dP.month       = values[i];           break;
				case  '%d'  : dP.day         = values[i];           break;
				case  '%h'  : dP.hour        = values[i];           break;
				case  '%M'  : dP.minute      = values[i];           break;
				case  '%S'  : dP.second      = values[i];           break;
				case  '%L'  : dP.millisecond = values[i];           break;
			}
		}
		return dP;
	}
	
	// Escapes characters that have a special meaning to the RegExp engine
	function _escapeRegexReservedChars( inputString ) {
		return inputString.replace(self.regex_escapeRegexReservedChars, '\\$&');
	}
	
	// Sanity checking for the input values
	function checkSanity( dateParts, dateObject, config ) {
		var timeRightNow = new Date().getTime();
		
		if( dateParts.month < 1 || dateParts.month > 12 )
			throw new Exception_Input_InvalidMonth( dateParts.month );
			
		if( dateParts.day < 1 || dateParts.day > 31 )
			throw new Exception_Input_InvalidDay( dateParts.day );
		
		if( config.dateIsInPast )
			if( dateObject.getTime() <  timeRightNow )
				throw new Exception_Input_DateIsInFuture( dateObject );
		
		if( config.dateIsInFuture )
			if( dateObject.getTime() >  timeRightNow )
				throw new Exception_Input_DateIsInPast( dateObject );
	}
	
	
	///////////////////////////////////////////////////////////////////////
	//                                                                   //
	//                       EXCEPTION HANDLING                          //
	//                                                                   //
	///////////////////////////////////////////////////////////////////////
	
	// MAIN Exception constructor -- throws exceptions to whatever code is calling the strftime_To_Date function so it can report errors.
	function ExceptionHandler(e, input, format, regex) {
		return {
			message : e.message,
			type    : e.type,
			debug   : {
				timeString : input,
				format     : format,
				regex      : regex
			}
		};
	}
	
	// Exception handlers for specific errors
	function Exception_Parse_Value() {
		return {
			message : 'Error parsing values out of input. Make sure that the date conforms to the format specified.',
			type    : 'PARSE_VALUE'
		}
	}
	function Exception_Input_Month( monthValue ) {
		return {
			message : monthValue + ' is not a valid entry for Month. Must be between 1 and 12.',
			type    : 'INPUT_SANITY_MONTH'
		}
	}
	function Exception_Input_DateIsInPast( dateObject ) {
		return {
			message : dateObject.toDateString() + ' is in the past. Date must be in the future.',
			type    : 'INPUT_SANITY_PAST'
		}
	}
	function Exception_Input_DateIsInFuture( dateObject ) {
		return {
			message : dateObject.toDateString() + ' is in the future. Date must be in the past.',
			type    : 'INPUT_SANITY_FUTURE'
		}
	}
	
	

}());
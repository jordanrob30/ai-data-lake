<?php

namespace App\Logging;

use Monolog\Formatter\JsonFormatter;
use Monolog\LogRecord;
use Monolog\Processor\WebProcessor;
use Monolog\Processor\IntrospectionProcessor;
use Monolog\Processor\PsrLogMessageProcessor;

class JsonLogFormatter
{
    /**
     * Customize the given logger instance.
     */
    public function __invoke($logger)
    {
        foreach ($logger->getHandlers() as $handler) {
            // Add processors for rich context
            $handler->pushProcessor(new PsrLogMessageProcessor());
            $handler->pushProcessor(new WebProcessor());
            $handler->pushProcessor(new IntrospectionProcessor());
            
            // Set JSON formatter
            $handler->setFormatter(new JsonFormatter());
        }
    }
}

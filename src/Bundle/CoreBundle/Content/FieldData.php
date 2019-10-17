<?php

namespace UniteCMS\CoreBundle\Content;

class FieldData
{
    protected $data;

    /**
     * @return string
     */
    public function __toString(): string
    {
        return is_string($this->data) ? $this->data : json_encode($this->data);
    }

    /**
     * FieldData constructor.
     * @param mixed $data
     */
    public function __construct($data = null)
    {
        $this->data = $data;
    }

    /**
     * @return mixed
     */
    public function getData()
    {
        return $this->data;
    }

    /**
     * @param string $dataKey
     * @param null $defaultValue
     *
     * @return mixed|null
     */
    public function resolveData(string $dataKey = '', $defaultValue = null) {

        if(empty($dataKey)) {
            return $this->getData();
        }

        if(is_array($this->data)) {
            return empty($this->data[$dataKey]) ? $defaultValue : $this->data[$dataKey];
        }

        return null;
    }
}
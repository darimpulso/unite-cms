<?php

namespace UniteCMS\DoctrineORMBundle\Content;

use Doctrine\Common\Persistence\ObjectManager;
use Doctrine\Common\Persistence\ObjectRepository;
use Symfony\Bridge\Doctrine\RegistryInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use UniteCMS\CoreBundle\Content\ContentFilterInput;
use UniteCMS\CoreBundle\Content\ContentInterface;
use UniteCMS\CoreBundle\Content\ContentManagerInterface;
use UniteCMS\CoreBundle\Content\ContentResultInterface;
use UniteCMS\CoreBundle\Domain\Domain;
use UniteCMS\DoctrineORMBundle\Entity\Content;

class ContentManager implements ContentManagerInterface
{
    const ENTITY = Content::class;

    /**
     * @var \Symfony\Bridge\Doctrine\RegistryInterface
     */
    protected $registry;

    /**
     * @var ValidatorInterface $validator
     */
    protected $validator;

    /**
     * ContentManager constructor.
     *
     * @param \Symfony\Bridge\Doctrine\RegistryInterface $registry
     * @param \Symfony\Component\Validator\Validator\ValidatorInterface $validator
     */
    public function __construct(RegistryInterface $registry, ValidatorInterface $validator)
    {
        $this->registry = $registry;
        $this->validator = $validator;
    }

    /**
     * @param \UniteCMS\CoreBundle\Domain\Domain $domain
     *
     * @return ObjectManager
     */
    protected function em(Domain $domain) : ObjectManager {
        return $this->registry->getManager($domain->getId());
    }

    /**
     * @param \UniteCMS\CoreBundle\Domain\Domain $domain
     *
     * @return \UniteCMS\DoctrineORMBundle\Repository\ContentRepository
     */
    protected function repository(Domain $domain) : ObjectRepository {
        return $this->em($domain)->getRepository(static::ENTITY);
    }

    /**
     * {@inheritDoc}
     */
    public function find(Domain $domain, string $type, ContentFilterInput $filter = null, array $orderBy = [], int $limit = 20, int $offset = 0, bool $includeDeleted = false, ?callable $resultFilter = null): ContentResultInterface {

        // TODO: Criteria
        $criteria = [];

        // TODO: Criteria
        $orderBy = [];

        return new ContentResult($this->repository($domain), $type, $criteria, $orderBy, $limit, $offset, $includeDeleted, $resultFilter);
    }

    /**
     * {@inheritDoc}
     */
    public function get(Domain $domain, string $type, string $id): ?ContentInterface
    {
        return $this->repository($domain)->typedFind($type, $id);
    }

    /**
     * {@inheritDoc}
     */
    public function create(Domain $domain, string $type): ContentInterface {
        $class = static::ENTITY;
        return new $class($type);
    }

    /**
     * {@inheritDoc}
     */
    public function update(Domain $domain, ContentInterface $content, array $inputData = [], bool $persist = false): ContentInterface {

        $content->setData($inputData);

        dump($this->validator->validate($content));

        if($persist) {

            if(empty($content->getId())) {
                $this->em($domain)->persist($content);
            }

            $this->em($domain)->flush($content);
        }

        return $content;
    }

    /**
     * {@inheritDoc}
     */
    public function delete(Domain $domain, string $type, ContentInterface $content, bool $persist = false): ContentInterface {

        dump($this->validator->validate($content), null, ['DELETE']);

        if($persist) {
            $this->em($domain)->remove($content);
            $this->em($domain)->flush($content);
        }
        return $content;
    }
}